import { KEYFRAMES_ID_PREFIX } from '../constants';
import StyleSheet from '../sheet';
import { getGroupForId } from '../sheet/GroupIDAllocator';
import { Keyframes as KeyframesType, Stringifier } from '../types';
import styledError from '../utils/error';
import generateAlphabeticName from '../utils/generateAlphabeticName';
import { KEYFRAMES_SYMBOL } from '../utils/isKeyframes';
import { setToString } from '../utils/setToString';
import { mainStylis } from './StyleSheetManager';

export default class Keyframes implements KeyframesType {
  readonly [KEYFRAMES_SYMBOL] = true as const;

  id: string;
  name: string;
  rules: string;

  constructor(name: string, rules: string) {
    this.name = name;
    this.id = KEYFRAMES_ID_PREFIX + name;
    this.rules = rules;

    // Eagerly register the group so keyframes defined before components
    // get a lower group ID and appear before them in the stylesheet.
    // Uses getGroupForId directly (not StyleSheet.registerId) because
    // GroupIDAllocator is pure JS; safe for native builds.
    getGroupForId(this.id);

    setToString(this, () => {
      throw styledError(12, String(this.name));
    });
  }

  inject = (styleSheet: StyleSheet, stylisInstance: Stringifier = mainStylis): void => {
    const resolvedName = this.getName(stylisInstance);
    if (!styleSheet.hasNameForId(this.id, resolvedName)) {
      styleSheet.insertRules(
        this.id,
        resolvedName,
        stylisInstance(this.rules, resolvedName, '@keyframes')
      );
    }
  };

  getName(stylisInstance: Stringifier = mainStylis): string {
    return stylisInstance.hash
      ? this.name + generateAlphabeticName(+stylisInstance.hash >>> 0)
      : this.name;
  }
}
