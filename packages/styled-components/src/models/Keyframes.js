// @flow

import { GroupRegistry, Sheet } from 'styled-sheet';
import StyledError from '../utils/error';

export default class Keyframes {
  id: string;

  group: number;

  name: string;

  rules: Array<string>;

  constructor(name: string, rules: Array<string>) {
    this.name = name;
    this.rules = rules;

    this.id = `sc-keyframes-${name}`;
    this.group = GroupRegistry.registerRuleGroup(this.id);
  }

  inject = (styleSheet: Sheet) => {
    styleSheet.inject(this.group, this.name, this.rules);
  };

  toString = () => {
    throw new StyledError(12, String(this.name));
  };

  getName() {
    return this.name;
  }
}
