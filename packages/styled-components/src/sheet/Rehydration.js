// @flow

import { SC_ATTR, SC_VERSION_ATTR, SC_VERSION } from '../constants';
import { getIdForGroup, setGroupForId } from './GroupIDAllocator';
import { getSheet } from './dom';
import type { Sheet } from './Sheet';

const SELECTOR = `style[${SC_ATTR}][${SC_VERSION_ATTR}="${SC_VERSION}"]`;
const MARKER_RE = new RegExp(`^${SC_ATTR}\\.g(\\d+)\\[id="([\\w\\d-]+)"\\]`, 'g');

export const outputSheet = (sheet: Sheet) => {
  const tag = sheet.getTag();
  const {length} = tag;

  let css = '';
  for (let group = 0; group < length; group++) {
    const id = getIdForGroup(group);
    if (id === undefined) continue;

    const names = sheet.names.get(id);
    const rules = tag.getGroup(group);
    const selector = `${SC_ATTR}.g${group}[id="${id}"]`;

    let content = '';
    if (names !== undefined) {
      names.forEach(name => {
        content += `${name},`;
      });
    }

    css += `${rules}\n${selector}{content:"${content}"}\n`;
  }

  return css;
};

export const rehydrateSheet = (sheet: Sheet) => {
  const nodes = document.querySelectorAll(SELECTOR);
  for (let i = 0, l = nodes.length; i < l; i++) {
    const node = ((nodes[i]: any): HTMLStyleElement);
    rehydrateSheetFromTag(sheet, node);
  }
};

const rehydrateNamesFromContent = (sheet: Sheet, id: string, content: string) => {
  const names = content.slice(1, -1).split(',');
  for (let i = 0, l = names.length; i < l; i++) {
    sheet.registerName(id, names[i]);
  }
};

const rehydrateSheetFromTag = (sheet: Sheet, style: HTMLStyleElement) => {
  const { cssRules } = getSheet(style);
  const rules: string[] = [];

  for (let i = 0, l = cssRules.length; i < l; i++) {
    const cssRule = (cssRules[i]: any);
    const marker = MARKER_RE.exec(cssRule.selectorText);

    if (marker !== null) {
      const group = parseInt(marker[1], 10) | 0;
      const id = marker[2];
      const {content} = cssRule.style;
      rehydrateNamesFromContent(sheet, id, content);
      setGroupForId(id, group);
      sheet.getTag().insertRules(group, rules);
      rules.length = 0;
    } else {
      rules.push(cssRule.cssText);
    }
  }
};
