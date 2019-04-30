// @flow
import { EMPTY_ARRAY } from '../utils/empties';
import flatten from '../utils/flatten';
import isStaticRules from '../utils/isStaticRules';
import stringifyRules from '../utils/stringifyRules';
import StyleSheet from '../sheet';

import type { RuleSet } from '../types';

export default class GlobalStyle {
  componentId: string;

  isStatic: boolean;

  rules: RuleSet;

  constructor(rules: RuleSet, componentId: string) {
    this.rules = rules;
    this.componentId = componentId;
    this.isStatic = isStaticRules(rules, EMPTY_ARRAY);
    StyleSheet.registerId(componentId);
  }

  createStyles(executionContext: Object, styleSheet: StyleSheet) {
    const flatCSS = flatten(this.rules, executionContext, styleSheet);
    const css = stringifyRules(flatCSS, '');
    const id = this.componentId;

    // NOTE: We use the id as a name as well, since these rules never change
    styleSheet.insertRules(id, id, css);
  }

  removeStyles(styleSheet: StyleSheet) {
    styleSheet.clearRules(this.componentId);
  }

  renderStyles(executionContext: Object, styleSheet: StyleSheet) {
    // NOTE: Remove old styles, then inject the new ones
    this.removeStyles(styleSheet);
    this.createStyles(executionContext, styleSheet);
  }
}
