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
import { keyFor, kindOfId, serverSeqOf } from './Order';
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

/**
 * The document or shadow root holding `target`'s server-rendered tags. A
 * shadow root is its own root node, so one `getRootNode()` covers both a
 * shadow root target and an element inside one.
 */
export const getRehydrationContainer = (
  target?: InsertionTarget | undefined
): Document | ShadowRoot => {
  const root = target && 'getRootNode' in target ? target.getRootNode() : target;
  return root && isShadowRoot(root) ? root : document;
};

/**
 * The sheet's CSS in position order. A server sheet that has flushed also re-emits, as full blocks,
 * the flushed groups a new rule or edge could put out of order on an element already in the page.
 */
export const outputSheet = (sheet: Sheet) => {
  const tag = sheet.getTag();
  const { order } = sheet;
  const { edgeSeeds, flushed, positions } = order;
  const { groupSizes } = tag;

  let reemit: Set<number> | undefined;
  if (flushed.size > 0) {
    const seeds = new Set(edgeSeeds);
    for (let i = 0; i < positions.length; i++) {
      if ((groupSizes[positions[i]] | 0) > 0) seeds.add(positions[i]);
    }
    reemit = order.reemitSet(seeds);
  }

  let css = '';
  for (let i = 0; i < positions.length; i++) {
    const group = positions[i];
    const full = reemit !== undefined && reemit.has(group);
    if (!full && (groupSizes[group] | 0) === 0) continue;

    const id = idForGroup(group);
    if (id === undefined) continue;

    const names = sheet.names.get(id);
    if (names === undefined || !names.size) continue;

    const added = tag.getGroup(group);
    const rules = full ? (flushed.get(group) ?? '') + added : added;
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

  sheet.order.adopt(group, key, kind, { full: marker[4] !== undefined, late });

  // looks like: data-styled.g11[id="idA"]{content:"nameA,"}
  const names = marker[5].split(',');
  let listed = 0;
  let unregistered = false;

  for (let j = 0; j < names.length; j++) {
    if (!names[j]) continue;

    listed++;
    if (!sheet.hasNameForId(id, names[j])) unregistered = true;
  }

  // A block lists names, not which rule came from which, so one new name inserts the whole block.
  if (listed > 0 && !unregistered) return;

  for (let j = 0; j < names.length; j++) {
    if (names[j]) sheet.registerName(id, names[j]);
  }
  sheet.getTag().insertRules(group, rules);
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
 * A tag between two page elements is the one placement whose removal breaks hydration, so only a
 * tag in the head or a shadow root, or one followed by another server tag or nothing, is removed.
 */
const isRemovable = (node: Element) => {
  const parent = node.parentNode;
  if (parent === null || parent === document.head || isShadowRoot(parent)) return true;

  const next = node.nextElementSibling;
  return next === null || next.matches(SERVER_TAG_SELECTOR);
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
  const container = getRehydrationContainer(sheet.options.target);

  if (__DEV__) {
    warnOnVersionMismatch(container);
  }

  adoptServerTags(sheet);

  if (__DEV__) {
    warnOnUnadoptableStyles(container);
  }
};
