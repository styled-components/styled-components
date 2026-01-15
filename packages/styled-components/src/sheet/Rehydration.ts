import { SC_ATTR, SC_ATTR_ACTIVE, SC_ATTR_VERSION, SC_VERSION, SPLITTER } from '../constants';
import { Sheet } from './types';

const SELECTOR = `style[${SC_ATTR}][${SC_ATTR_VERSION}="${SC_VERSION}"]`;
const MARKER_RE = new RegExp(`^${SC_ATTR}\\.g\\[id="([\\w\\d-]+)"\\].*?"([^"]*)`);

export const outputSheet = (sheet: Sheet) => {
  const tag = sheet.getTag();
  let css = '';
  const ids = tag.getIds();
  let idResult = ids.next();

  while (!idResult.done) {
    const id = idResult.value;
    const names = sheet.names.get(id);
    const rules = tag.getGroup(id);
    if (names === undefined || !names.size || rules.length === 0) continue;

    const selector = `${SC_ATTR}.g[id="${id}"]`;

    let content = '';
    names.forEach(name => {
      if (name.length > 0) {
        content += `${name},`;
      }
    });

    css += `${rules}${selector}{content:"${content}"}${SPLITTER}`;
    idResult = ids.next();
  }

  return css;
};

const rehydrateNamesFromContent = (sheet: Sheet, id: string, content: string) => {
  const names = content.split(',');
  for (let i = 0; i < names.length; i++) {
    if (names[i]) {
      sheet.registerName(id, names[i]);
    }
  }
};

const rehydrateSheetFromTag = (sheet: Sheet, style: HTMLStyleElement) => {
  const parts = (style.textContent ?? '').split(SPLITTER);
  const rules: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    const marker = part.match(MARKER_RE);

    if (marker) {
      const id = marker[1];
      rehydrateNamesFromContent(sheet, id, marker[2]);
      if (rules.length > 0) {
        sheet.getTag().insertRules(id, rules);
      }
      rules.length = 0;
    } else {
      rules.push(part);
    }
  }
};

export const rehydrateSheet = (sheet: Sheet) => {
  const nodes = document.querySelectorAll(SELECTOR);

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i] as HTMLStyleElement;
    if (node && node.getAttribute(SC_ATTR) !== SC_ATTR_ACTIVE) {
      rehydrateSheetFromTag(sheet, node);

      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
  }
};
