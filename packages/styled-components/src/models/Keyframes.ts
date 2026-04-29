import { KEYFRAMES_ID_PREFIX } from '../constants';
import StyleSheet from '../sheet';
import { groupForId } from '../sheet/GroupIDAllocator';
import { Compiler, Keyframes as KeyframesType } from '../types';
import styledError from '../utils/error';
import generateAlphabeticName from '../utils/generateAlphabeticName';
import { KEYFRAMES_SYMBOL } from '../utils/isKeyframes';
import { setToString } from '../utils/setToString';
import { mainCompiler } from './StyleSheetManager';

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
    // Uses groupForId directly (not StyleSheet.registerId) because
    // GroupIDAllocator is pure JS; safe for native builds.
    groupForId(this.id);

    setToString(this, () => {
      throw styledError(12, String(this.name));
    });
  }

  inject = (styleSheet: StyleSheet, compiler: Compiler = mainCompiler): void => {
    const resolvedName = this.getName(compiler);
    if (!styleSheet.hasNameForId(this.id, resolvedName)) {
      styleSheet.insertRules(
        this.id,
        resolvedName,
        compiler.compile(this.rules, resolvedName, '@keyframes')
      );
    }
  };

  getName(compiler: Compiler = mainCompiler): string {
    return compiler.hash ? this.name + generateAlphabeticName(+compiler.hash >>> 0) : this.name;
  }
}
