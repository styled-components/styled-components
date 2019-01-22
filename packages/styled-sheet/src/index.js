const IS_BROWSER = true;
const DISABLE_SPEEDY = false;
const MAX_SIZE = DISABLE_SPEEDY ? 40 : 1000;

class ServerStyleSheet {
  rules = [];

  insertRule = (rule /* , index */) => {
    this.rules.push(rule);
  };
}

class DOMStyleSheet {
  tags = [];

  _getTag = index => {
    const tagIndex = Math.ceil(index / MAX_SIZE);
    if (!this.tags[tagIndex]) this.tags[tagIndex] = this._createTag();
    return this.tags[tagIndex];
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

  insertRule = (rule, index) => {
    const tag = this._getTag(index);
    tag.sheet.insertRule(rule, tag.sheet.cssRules.length);
  };
}

class StyleSheet {
  rules = [];

  constructor() {
    this.sheet = IS_BROWSER ? new DOMStyleSheet() : new ServerStyleSheet();
  }

  insertRules = (rules, creationIndex) => {
    const injectionIndex = this.rules.reduce((group, index) => {
      if (index <= creationIndex) return index + group.length;
      return index;
    }, 0);

    this.rules.push(rules);
    rules.forEach((rule, ruleIndex) => {
      this.sheet.insertRule(rule, injectionIndex + ruleIndex);
    });
  };
}

export default StyleSheet;
