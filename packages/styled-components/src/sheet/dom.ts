import { SC_ATTR, SC_ATTR_ACTIVE, SC_ATTR_VERSION, SC_VERSION } from '../constants';
import { InsertionTarget } from '../types';
import styledError from '../utils/error';
import getNonce from '../utils/nonce';

const findLastStyleTag = (target: InsertionTarget): void | HTMLStyleElement => {
  const list = target.querySelectorAll<HTMLStyleElement>(`style[${SC_ATTR}]`);
  return list[list.length - 1];
};

export const makeStyleTag = (
  target?: InsertionTarget | undefined,
  nonce?: string | undefined
): HTMLStyleElement => {
  const head = document.head;
  const parent = target || head;
  const style = document.createElement('style');
  const prevStyle = findLastStyleTag(parent);
  const nextSibling = prevStyle !== undefined ? prevStyle.nextSibling : null;

  style.setAttribute(SC_ATTR, SC_ATTR_ACTIVE);
  style.setAttribute(SC_ATTR_VERSION, SC_VERSION);

  const resolvedNonce = nonce || getNonce();

  if (resolvedNonce) style.setAttribute('nonce', resolvedNonce);

  parent.insertBefore(style, nextSibling);

  return style;
};

export const getSheet = (tag: HTMLStyleElement): CSSStyleSheet => {
  if (tag.sheet) {
    return tag.sheet;
  }

  // Avoid Firefox quirk where the style element might not have a sheet property.
  // Use the tag's root node to find styleSheets; document.styleSheets doesn't
  // include sheets inside shadow roots.
  const root = tag.getRootNode() as Document | ShadowRoot;
  const styleSheets = root.styleSheets ?? document.styleSheets;
  for (let i = 0, l = styleSheets.length; i < l; i++) {
    const sheet = styleSheets[i];
    if (sheet.ownerNode === tag) {
      // `document.styleSheets`/`ShadowRoot.styleSheets` is typed as
      // `StyleSheetList`, whose entries are `CSSStyleSheet` at runtime
      // but the iteration return type widens to `StyleSheet`.
      return sheet as CSSStyleSheet;
    }
  }

  throw styledError(17);
};

/** Remove a GlobalStyle's SSR-rendered inline style tag(s) from the DOM */
export const removeGlobalStyleTag = (componentId: string, target?: InsertionTarget): void => {
  if (typeof document === 'undefined') return;

  const container = target ?? document;
  const styleTags = container.querySelectorAll(`style[data-styled-global="${componentId}"]`);
  styleTags.forEach(tag => tag.remove());
};
