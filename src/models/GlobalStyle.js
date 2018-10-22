// @flow
import flatten from '../utils/flatten';
import isStaticRules from '../utils/isStaticRules';
import stringifyRules from '../utils/stringifyRules';
import StyleSheet from './StyleSheet';

import type { RuleSet, SourceMap } from '../types';

export default class GlobalStyle {
  componentId: string;

  isStatic: boolean;

  rules: RuleSet;

  sourceMap: SourceMap;

  constructor(rules: RuleSet, componentId: string, sourceMap: SourceMap) {
    this.rules = rules;
    this.componentId = componentId;
    this.isStatic = isStaticRules(rules);
    this.sourceMap = sourceMap;
    if (!StyleSheet.master.hasId(componentId)) {
      StyleSheet.master.deferredInject(componentId, [], sourceMap);
    }
  }

  createStyles(executionContext: Object, styleSheet: StyleSheet) {
    const flatCSS = flatten(this.rules, executionContext, styleSheet);
    const css = stringifyRules(flatCSS, '');
    styleSheet.inject(this.componentId, css, undefined, this.sourceMap);
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
