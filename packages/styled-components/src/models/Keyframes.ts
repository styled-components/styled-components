import StyleSheet from '../sheet';
import { Keyframes as KeyframesType, Stringifier } from '../types';
import styledError from '../utils/error';
import { setToString } from '../utils/setToString';
import { mainStylis } from './StyleSheetManager';

export default class Keyframes implements KeyframesType {
  id: string;
  name: string;
  rules: string;

  constructor(name: string, rules: string) {
    this.name = name;
    this.id = `sc-keyframes-${name}`;
    this.rules = rules;

    setToString(this, () => {
      throw styledError(12, String(this.name));
    });
  }

  inject = (styleSheet: StyleSheet, stylisInstance: Stringifier = mainStylis): void => {
    const resolvedName = this.name + stylisInstance.hash;

    if (!styleSheet.hasNameForId(this.id, resolvedName)) {
      styleSheet.insertRules(
        this.id,
        resolvedName,
        stylisInstance(this.rules, resolvedName, '@keyframes')
      );
    }
  };

  getName(stylisInstance: Stringifier = mainStylis): string {
    return this.name + stylisInstance.hash;
  }
}
