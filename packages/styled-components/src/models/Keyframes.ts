import StyleSheet from '../sheet';
import { Keyframes as KeyframesType, Stringifier } from '../types';
import styledError from '../utils/error';
import { masterStylis } from './StyleSheetManager';

export default class Keyframes implements KeyframesType {
  id: string;
  name: string;
  rules: string;

  constructor(name: string, rules: string) {
    this.name = name;
    this.id = `sc-keyframes-${name}`;
    this.rules = rules;
  }

  inject = (styleSheet: StyleSheet, stylisInstance: Stringifier = masterStylis): void => {
    const resolvedName = this.name + stylisInstance.hash;

    if (!styleSheet.hasNameForId(this.id, resolvedName)) {
      styleSheet.insertRules(
        this.id,
        resolvedName,
        stylisInstance(this.rules, resolvedName, '@keyframes')
      );
    }
  };

  toString = (): void => {
    throw styledError(12, String(this.name));
  };

  getName(stylisInstance: Stringifier = masterStylis): string {
    return this.name + stylisInstance.hash;
  }
}
