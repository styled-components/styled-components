// @flow

import { SC_ATTR, SC_ATTR_VERSION, SC_VERSION, SC_ACTIVE, NONCE } from './constants';

export const setStyledAttributes = (tag: HTMLElement): void => {
  tag.setAttribute(SC_ATTR, SC_ACTIVE);
  tag.setAttribute(SC_ATTR_VERSION, SC_VERSION);
  tag.setAttribute('nonce', NONCE);
};

export const makeStyleTag = (target?: HTMLElement): HTMLStyleElement => {
  // $FlowFixMe
  const head = (document.head: HTMLElement);
  const element = document.createElement('style');
  setStyledAttributes(element);
  (target || head).appendChild(element);
  return element;
};

export const getSheet = (tag: HTMLStyleElement): CSSStyleSheet => {
  if (tag.sheet) {
    // $FlowFixMe
    return (tag.sheet: CSSStyleSheet);
  }

  /* Firefox quirk requires us to step through all stylesheets to find one owned by the given tag */
  const { styleSheets } = document;
  for (let i = 0, l = styleSheets.length; i < l; i++) {
    const sheet = styleSheets[i];
    if (sheet.ownerNode === tag) {
      // $FlowFixMe
      return (sheet: CSSStyleSheet);
    }
  }

  throw new TypeError(`CSSStyleSheet could not be found on HTMLStyleElement`);
};

export const makeCssMarker = (name: string, group: number, keys: string[]) => `/*sc-${group}:${name}:${keys.join(',')}*/`;

export const cssMarkerRe = new RegExp(/\/\*sc-(\d+):([^:]+):([^*]*)\*\//, 'g');
