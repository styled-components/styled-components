// @flow
const IS_BROWSER = true;

class ServerStyleSheet {
  rules = [];

  insertRule = (rule /* , index */) => {
    this.rules.push(rule);
  };
}

export class DOMStyleSheet {
  tag: ?HTMLStyleElement;

  tag = null;

  insertRule = (rule: string, index: number) => {
    const tag = this._getTag();
    // $FlowIssue flow doesn't understand the CSSOM
    return tag.sheet.insertRule(rule, index);
  };

  _getTag = () => {
    if (this.tag) return this.tag;
    return (this.tag = this._createTag());
  };

  _createTag = () => {
    const el = document.createElement('style');
    // el.setAttribute(SC_ATTR, '');
    // el.setAttribute(SC_VERSION_ATTR, __VERSION__);

    // const nonce = getNonce();
    // if (nonce) {
    //   el.setAttribute('nonce', nonce);
    // }

    /* Work around insertRule quirk in EdgeHTML */
    el.appendChild(document.createTextNode(''));

    document.head.appendChild(el);

    return el;
  };
}

class StyleSheet {
  ruleGroups: Array<number>;

  sheet: typeof DOMStyleSheet;

  ruleGroups = [];

  constructor(sheet: typeof DOMStyleSheet) {
    this.sheet = sheet || (IS_BROWSER ? new DOMStyleSheet() : new ServerStyleSheet());
  }

  insertRules = (ruleGroup: Array<string>, creationIndex: number) => {
    const injectionIndex = this.ruleGroups.reduce((count, acc) => {
      if (acc <= creationIndex) return acc + count;
      return acc;
    }, 0);

    if (!this.ruleGroups[creationIndex]) this.ruleGroups[creationIndex] = 0;
    ruleGroup.forEach((rule, ruleIndex) => {
      try {
        this.sheet.insertRule(rule, injectionIndex + ruleIndex);
        this.ruleGroups[creationIndex] += 1;
        // eslint-disable-next-line no-empty
      } catch (err) {}
    });
  };
}

export default StyleSheet;
