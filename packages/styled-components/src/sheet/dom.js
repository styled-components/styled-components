// @flow

import { SC_ATTR, SC_VERSION_ATTR, SC_VERSION } from '../constants';

const ELEMENT_TYPE = 1; /* Node.ELEMENT_TYPE */

/** Find last style element if any inside target */
const findLastStyleTag = (target: HTMLElement): void | HTMLStyleElement => {
  const { childNodes } = target;

  for (let i = childNodes.length; i >= 0; i--) {
    const child = ((childNodes[i]: any): ?HTMLElement);
    if (
      child &&
      child.nodeType === ELEMENT_TYPE &&
      child.getAttribute(SC_ATTR)
    ) {
      return ((child: any): HTMLStyleElement);
    }
  }

  return undefined;
};

/** Create a style element inside `target` or <head> after the last */
export const makeStyleTag = (target?: HTMLElement): HTMLStyleElement => {
  const head = ((document.head: any): HTMLElement);
  const parent = target || head;
  const style = document.createElement('style');
  const prevStyle = findLastStyleTag(parent);
  const nextSibling = prevStyle !== undefined ? prevStyle.nextSibling : null;

  style.setAttribute(SC_ATTR, '');
  style.setAttribute(SC_VERSION_ATTR, SC_VERSION);
  parent.insertBefore(style, nextSibling);

  return style;
};

/** Get the CSSStyleSheet instance for a given style element */
export const getSheet = (tag: HTMLStyleElement): CSSStyleSheet => {
  if (tag.sheet) {
    return ((tag.sheet: any): CSSStyleSheet);
  }

  // Avoid Firefox quirk where the style element might not have a sheet property
  const { styleSheets } = document;
  for (let i = 0, l = styleSheets.length; i < l; i++) {
    const sheet = styleSheets[i];
    if (sheet.ownerNode === tag) {
      return ((sheet: any): CSSStyleSheet);
    }
  }

  throw new TypeError(`CSSStyleSheet could not be found on HTMLStyleElement`);
};
