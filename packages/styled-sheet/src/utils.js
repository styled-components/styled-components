// @flow

import { SC_ATTR, SC_ATTR_VERSION, SC_VERSION, NONCE } from './constants';

// $FlowFixMe
const head = (document.head: HTMLElement);

export const setStyledAttributes = (tag: HTMLElement): void => {
  tag.setAttribute(SC_ATTR, '');
  tag.setAttribute(SC_ATTR_VERSION, SC_VERSION);
  tag.setAttribute('nonce', NONCE);
};

export const makeStyleTag = (target?: HTMLElement): HTMLStyleElement => {
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
