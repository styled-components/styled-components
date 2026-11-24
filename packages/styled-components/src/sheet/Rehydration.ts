import {
  IS_BROWSER,
  SC_ATTR,
  SC_ATTR_ACTIVE,
  SC_ATTR_VERSION,
  SC_VERSION,
  SPLITTER,
} from '../constants';
import { InsertionTarget } from '../types';
import { warnOnce } from '../utils/warnOnce';
import { adoptGroupForId, idForGroup } from './GroupIDAllocator';
import { keyFor, kindOfId, noteLayers, serverSeqOf } from './Order';
import { Sheet } from './types';

/** Set on a server tag that was adopted but left in the page, so no later pass adopts it again. */
const SC_ATTR_ADOPTED = 'data-sc-adopted';

const SELECTOR = `style[${SC_ATTR}][${SC_ATTR_VERSION}="${SC_VERSION}"]:not([${SC_ATTR_ADOPTED}])`;
const SERVER_TAG_SELECTOR = `style[${SC_ATTR}]`;

/**
 * A group marker: `data-styled.g<number>[id="<id>"]`, then `.s<seq>` (server groups) and `.f` (a
 * full block), then `{content:"<names>"`. Captures: number, id, seq, full flag, names.
 */
export const MARKER_RE = new RegExp(
  `^${SC_ATTR}\\.g(\\d+)\\[id="([\\w\\d-]+)"\\](?:\\.s(\\d+))?(\\.f)?\\{content:\\s*"([^"]*)`
);

/** A shadow root is a document fragment (nodeType 11) with a `host`. */
const isShadowRoot = (node: InsertionTarget | Node): node is ShadowRoot =>
  'host' in node && node.nodeType === 11;

/** The document owning `target`, handling a Document passed directly (`ownerDocument === null`). */
export const getTargetDocument = (target?: InsertionTarget | undefined): Document =>
  target?.nodeType === 9 ? (target as unknown as Document) : (target?.ownerDocument ?? document);

/**
 * The document or shadow root holding `target`'s server-rendered tags. A
 * shadow root is its own root node, so one `getRootNode()` covers both a
 * shadow root target and an element inside one.
 */
export const getRehydrationContainer = (
  target?: InsertionTarget | undefined
): Document | ShadowRoot => {
  const root = target && 'getRootNode' in target ? target.getRootNode() : target;
  return root && (isShadowRoot(root) || root.nodeType === 9)
    ? (root as Document | ShadowRoot)
    : (target?.ownerDocument ?? document);
};

/**
 * The sheet's CSS in position order. A server sheet that has flushed also re-emits, as full blocks,
 * the flushed groups a new rule or edge could put out of order on an element already in the page.
 */
export const outputSheet = (sheet: Sheet) => {
  const tag = sheet.getTag();
  const { order } = sheet;
  const { posList, streamFlush } = order;
  const { groupSizes } = tag;

  const reemit = streamFlush?.reemitFor(groupSizes);

  let css = '';
  for (let i = 0; i < posList.length; i++) {
    const group = posList[i];
    const full = reemit !== undefined && reemit.has(group);
    if (!full && (groupSizes[group] | 0) === 0) continue;

    const id = idForGroup(group);
    if (id === undefined) continue;

    const names = sheet.names.get(id);
    if (names === undefined || !names.size) continue;

    const added = tag.getGroup(group);
    const rules = full ? (streamFlush?.flushed.get(group) ?? '') + added : added;
    if (rules.length === 0) continue;

    const seq = serverSeqOf(order.keyOf(group));
    const selector =
      SC_ATTR +
      '.g' +
      group +
      '[id="' +
      id +
      '"]' +
      (seq === undefined ? '' : '.s' + seq) +
      (full ? '.f' : '');

    let content = '';
    for (const name of names) {
      if (name.length > 0) {
        content += name + ',';
      }
    }

    // The marker follows the rules so rehydration can collect them first.
    css += rules + selector + '{content:"' + content + '"}' + SPLITTER;
  }

  return css;
};

/** Takes one marker's block into the sheet: places its group, then inserts its rules unless every name is known. */
const adoptBlock = (sheet: Sheet, marker: RegExpMatchArray, rules: string[], late: boolean) => {
  const number = +marker[1] | 0;
  const id = marker[2];
  const seq = marker[3];
  const kind = kindOfId(id);
  const group = adoptGroupForId(id, number);
  const key = keyFor(kind, number, seq === undefined ? undefined : { seq: +seq, server: true });

  sheet.order.adoptGroup(group, key, kind, { full: marker[4] !== undefined, late });

  // looks like: data-styled.g11[id="idA"]{content:"nameA,"}
  const names = marker[5].split(',');
  let listed = 0;
  let unregistered = false;

  for (let j = 0; j < names.length; j++) {
    const name = names[j];
    if (!name) continue;

    listed++;
    if (!sheet.hasNameForId(id, name)) {
      unregistered = true;
      sheet.registerName(id, name);
    }
  }

  // A block lists names, not which rule came from which, so one new name inserts the whole block.
  if (listed === 0 || unregistered) {
    if (__DEV__) {
      for (let i = 0; i < rules.length; i++) {
        if (rules[i].charCodeAt(0) === 64) noteLayers(sheet.order, group, rules[i]);
      }
    }
    sheet.getTag().insertRules(group, rules);
  }
};

const adoptTag = (sheet: Sheet, style: HTMLStyleElement, late: boolean) => {
  const parts = (style.textContent ?? '').split(SPLITTER);
  const rules: string[] = [];

  for (let i = 0, l = parts.length; i < l; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    const marker = part.match(MARKER_RE);

    if (marker) {
      if ((+marker[1] | 0) !== 0) adoptBlock(sheet, marker, rules, late);

      rules.length = 0;
    } else {
      rules.push(part);
    }
  }
};

/**
 * Removing a tag that precedes a page element breaks hydration, so only a tag in the head or a
 * shadow root, or one with only server tags remaining after it to the end of its parent, is removed.
 */
const isRemovable = (node: Element) => {
  const parent = node.parentNode;
  if (parent === null || parent === node.ownerDocument?.head || isShadowRoot(parent)) return true;

  let next = node.nextElementSibling;
  while (next !== null && next.matches(SERVER_TAG_SELECTOR)) next = next.nextElementSibling;
  return next === null;
};

/**
 * A `<style>` that opts into React's `precedence` hoisting reaches the DOM
 * under React's own attributes, without the ones {@link SELECTOR} keys on, so
 * the rules it carries can never be adopted and get injected a second time on
 * the client. The group markers survive inside the CSS text, which is what
 * distinguishes our stripped styles from another library's hoisted ones.
 */
const warnOnUnadoptableStyles = (container: Document | ShadowRoot) => {
  const nodes = container.querySelectorAll<HTMLStyleElement>('style[data-precedence]');

  for (let i = 0, l = nodes.length; i < l; i++) {
    if ((nodes[i].textContent ?? '').indexOf(SC_ATTR + '.g') > -1) {
      warnOnce(
        'rehydration-precedence-style',
        'server-rendered styles were found in a <style> tag with a `precedence` prop, so every rule is injected again on the client. Render the tag from `ServerStyleSheet#getStyleElement()` with no `precedence` or `href` prop.'
      );
      return;
    }
  }
};

/**
 * {@link SELECTOR} only matches the running version, so a server-rendered tag
 * from another version is skipped without a trace and its class names go stale.
 * Browser-created "active" tags carry a version stamp too; a second client copy
 * at another version is the base.ts multiple-instances warning's case, not this one.
 */
const warnOnVersionMismatch = (container: Document | ShadowRoot) => {
  const tags = container.querySelectorAll(`style[${SC_ATTR}]`);

  for (let i = 0, l = tags.length; i < l; i++) {
    if (tags[i].getAttribute(SC_ATTR) === SC_ATTR_ACTIVE) continue;

    const serverVersion = tags[i].getAttribute(SC_ATTR_VERSION);

    if (serverVersion !== null && serverVersion !== SC_VERSION) {
      warnOnce(
        'rehydration-version-mismatch',
        `found server-rendered styles from styled-components ${serverVersion}, but this copy is ${SC_VERSION}. If both come from the same app, class names will not match and hydration will fail: make sure the server and the browser load the same version (run \`npm ls styled-components\` to find duplicates). Pages that intentionally host separate apps on different versions can ignore this.`
      );
      return;
    }
  }
};

/** True when the page holds a server tag `sheet` has not adopted yet (adoption happens on its next write). */
export const hasUnadoptedServerTags = (sheet: Sheet): boolean => {
  if (!IS_BROWSER) return false;

  const nodes = getRehydrationContainer(sheet.options.target).querySelectorAll<HTMLStyleElement>(
    SELECTOR
  );

  for (let i = 0, l = nodes.length; i < l; i++) {
    if (nodes[i].getAttribute(SC_ATTR) !== SC_ATTR_ACTIVE) return true;
  }

  return false;
};

/**
 * Adopts every server tag not yet adopted, in document order. The first pass appends each group; a
 * later pass (late adoption) places a global or keyframes group by key and appends a component.
 */
export const adoptServerTags = (sheet: Sheet) => {
  const nodes = getRehydrationContainer(sheet.options.target).querySelectorAll<HTMLStyleElement>(
    SELECTOR
  );
  const late = sheet.order.rehydrated;

  for (let i = 0, l = nodes.length; i < l; i++) {
    const node = nodes[i];
    if (node.getAttribute(SC_ATTR) === SC_ATTR_ACTIVE) continue;

    adoptTag(sheet, node, late);

    if (isRemovable(node)) {
      node.remove();
    } else {
      // The sheet holds these rules now; a live copy later in the page would outrank the sheet's later rules.
      node.textContent = '';
      node.setAttribute(SC_ATTR_ADOPTED, '');
    }
  }

  sheet.order.rehydrated = true;
};

export const rehydrateSheet = (sheet: Sheet) => {
  const firstPass = !sheet.order.rehydrated;

  if (__DEV__) {
    const container = getRehydrationContainer(sheet.options.target);
    warnOnVersionMismatch(container);
    adoptServerTags(sheet);
    warnOnUnadoptableStyles(container);
  } else {
    adoptServerTags(sheet);
  }

  // Tags that stream in after the bundle runs are adopted when the sheet is next written,
  // and once more when parsing ends.
  if (firstPass && !sheet.options.isServer) {
    const doc = getTargetDocument(sheet.options.target);
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', () => adoptServerTags(sheet), { once: true });
    }
  }
};
