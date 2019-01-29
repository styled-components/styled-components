// @flow

import { GroupRegistry, Sheet } from 'styled-sheet';

import flatten from '../utils/flatten';
import stringifyRules from '../utils/stringifyRules';

import type { RuleSet } from '../types';

export default class GlobalStyle {
  componentId: string;

  group: number;

  rules: RuleSet;

  constructor(rules: RuleSet, componentId: string) {
    this.rules = rules;
    this.componentId = componentId;
    this.group = GroupRegistry.registerRuleGroup(componentId);
  }

  createStyles(executionContext: Object, styleSheet: Sheet) {
    const flatCSS = flatten(this.rules, executionContext, styleSheet);
    const css = stringifyRules(flatCSS, '');
    // componentId is used as key, which means only one variant of GlobalStyle
    // can be rendered at all times
    styleSheet.inject(this.group, this.componentId, css);
  }

  removeStyles(styleSheet: Sheet) {
    styleSheet.remove(this.group);
  }

  renderStyles(executionContext: Object, styleSheet: Sheet) {
    this.removeStyles(styleSheet);
    this.createStyles(executionContext, styleSheet);
  }
}
