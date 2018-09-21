// @flow
import StyleSheet from '../models/StyleSheet';

export default class Keyframes {
  id: string;
  name: string;
  rules: Array<string>;

  constructor(name: string, rules: Array<string>) {
    this.name = name;
    this.rules = rules;

    this.id = `sc-keyframes-${name}`;
  }

  inject = (styleSheet: StyleSheet) => {
    if (!styleSheet.hasNameForId(this.id, this.name)) {
      styleSheet.inject(this.id, this.rules, this.name);
    }
  };

  getName() {
    return this.name;
  }
}
