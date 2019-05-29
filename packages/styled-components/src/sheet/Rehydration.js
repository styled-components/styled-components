// @flow

import { SC_ATTR, SC_ATTR_ACTIVE, SC_VERSION_ATTR, SC_VERSION } from '../constants';
import { getIdForGroup, setGroupForId } from './GroupIDAllocator';
import { getSheet } from './dom';
import type { Sheet } from './types';

const PLAIN_RULE_TYPE = 1;
const SELECTOR = `style[${SC_ATTR}][${SC_VERSION_ATTR}="${SC_VERSION}"]`;
const MARKER_RE = new RegExp(`^${SC_ATTR}\\.g(\\d+)\\[id="([\\w\\d-]+)"\\]`);

export const outputSheet = (sheet: Sheet) => {
  const tag = sheet.getTag();
  const {length} = tag;

  let css = '';
  for (let group = 0; group < length; group++) {
    const id = getIdForGroup(group);
    if (id === undefined) continue;

    const names = sheet.names.get(id);
    const rules = tag.getGroup(group);
    if (names === undefined || rules.length === 0) continue;

    const selector = `${SC_ATTR}.g${group}[id="${id}"]`;

    let content = '';
    if (names !== undefined) {
      names.forEach(name => {
        if (name.length > 0) {
          content += `${name},`;
        }
      });
    }

    // NOTE: It's easier to collect rules and have the marker
    // after the actual rules to simplify the rehydration
    css += `${rules}${selector}{content:"${content}"}\n`;
  }

  return css;
};

const rehydrateNamesFromContent = (sheet: Sheet, id: string, content: string) => {
  const names = content.slice(1, -1).split(',');
  for (let i = 0, l = names.length; i < l; i++) {
    const name = names[i];
    if (name.length > 0) {
      sheet.registerName(id, name);
    }
  }
};

const rehydrateSheetFromTag = (sheet: Sheet, style: HTMLStyleElement) => {
  const { cssRules } = getSheet(style);
  const rules: string[] = [];

  for (let i = 0, l = cssRules.length; i < l; i++) {
    const cssRule = (cssRules[i]: any);

    if (cssRule.type !== PLAIN_RULE_TYPE) {
      rules.push(cssRule.cssText);
    } else {
      const marker = cssRule.selectorText.match(MARKER_RE);

      if (marker !== null) {
        const group = parseInt(marker[1], 10) | 0;
        const id = marker[2];
        const { content } = cssRule.style;

        if (group !== 0) {
          // Rehydrate componentId to group index mapping
          setGroupForId(id, group);
          // Rehydrate names and rules
          rehydrateNamesFromContent(sheet, id, content);
          sheet.getTag().insertRules(group, rules);
        }

        rules.length = 0;
      } else {
        rules.push(cssRule.cssText);
      }
    }
  }
};

export const rehydrateSheet = (sheet: Sheet) => {
  const nodes = document.querySelectorAll(SELECTOR);

  for (let i = 0, l = nodes.length; i < l; i++) {
    const node = ((nodes[i]: any): HTMLStyleElement);
    if (node && node.getAttribute(SC_ATTR) !== SC_ATTR_ACTIVE) {
      rehydrateSheetFromTag(sheet, node);

      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
  }
};
