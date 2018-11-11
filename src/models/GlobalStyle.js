// @flow
import { EMPTY_ARRAY } from '../utils/empties';
import flatten from '../utils/flatten';
import isStaticRules from '../utils/isStaticRules';
import stringifyRules from '../utils/stringifyRules';
import StyleSheet from './StyleSheet';

import type { RuleSet } from '../types';

export default class GlobalStyle {
  componentId: string;

  isStatic: boolean;

  rules: RuleSet;

  constructor(rules: RuleSet, componentId: string) {
    this.rules = rules;
    this.componentId = componentId;
    this.isStatic = isStaticRules(rules, EMPTY_ARRAY);

    if (!StyleSheet.master.hasId(componentId)) {
      StyleSheet.master.deferredInject(componentId, []);
    }
  }

  createStyles(executionContext: Object, styleSheet: StyleSheet) {
    const flatCSS = flatten(this.rules, executionContext, styleSheet);
    const css = stringifyRules(flatCSS, '');

    styleSheet.inject(this.componentId, css);
  }

  removeStyles(styleSheet: StyleSheet) {
    const { componentId } = this;
    if (styleSheet.hasId(componentId)) {
      styleSheet.remove(componentId);
    }
  }

  // TODO: overwrite in-place instead of remove+create?
  renderStyles(executionContext: Object, styleSheet: StyleSheet) {
    this.removeStyles(styleSheet);
    this.createStyles(executionContext, styleSheet);
  }
}
