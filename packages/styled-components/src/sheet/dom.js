// @flow

import { SC_ATTR, SC_VERSION_ATTR } from '../constants';

declare var __VERSION__: string;

/** Create a style element inside `target` or <head> */
export const makeStyleTag = (target?: HTMLElement): HTMLStyleElement => {
  const head = ((document.head: any): HTMLElement);
  const element = document.createElement('style');

  el.setAttribute(SC_ATTR, '');
  el.setAttribute(SC_VERSION_ATTR, __VERSION__);
  (target || head).appendChild(element);

  return element;
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
