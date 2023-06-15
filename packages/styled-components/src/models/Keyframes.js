// @flow
import StyleSheet from '../sheet';
import { type Stringifier } from '../types';
import throwStyledError from '../utils/error';
import { setToString } from '../utils/setToString';
import { masterStylis } from './StyleSheetManager';

export default class Keyframes {
  id: string;

  name: string;

  rules: string;

  constructor(name: string, rules: string) {
    this.name = name;
    this.id = `sc-keyframes-${name}`;
    this.rules = rules;

    setToString(this, () => {
      throwStyledError(12, String(this.name));
    });
  }

  inject = (styleSheet: StyleSheet, stylisInstance: Stringifier = masterStylis) => {
    const resolvedName = this.name + stylisInstance.hash;

    if (!styleSheet.hasNameForId(this.id, resolvedName)) {
      styleSheet.insertRules(
        this.id,
        resolvedName,
        stylisInstance(this.rules, resolvedName, '@keyframes')
      );
    }
  };

  getName(stylisInstance: Stringifier = masterStylis) {
    return this.name + stylisInstance.hash;
  }
}
