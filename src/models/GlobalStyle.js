// @flow
import { EMPTY_ARRAY } from '../utils/empties';
import flatten from '../utils/flatten';
import isStaticRules from '../utils/isStaticRules';
import stringifyRules from '../utils/stringifyRules';
import GlobalStyleSheet from './GlobalStyleSheet';

import type { RuleSet } from '../types';

export default class GlobalStyle {
  componentId: string;

  isStatic: boolean;

  rules: RuleSet;

  constructor(rules: RuleSet, componentId: string) {
    this.rules = rules;
    this.componentId = componentId;
    this.isStatic = isStaticRules(rules, EMPTY_ARRAY);

    if (!GlobalStyleSheet.master.hasId(componentId)) {
      GlobalStyleSheet.master.deferredInject(componentId, []);
    }
  }

  createStyles(executionContext: Object, styleSheet: GlobalStyleSheet) {
    const flatCSS = flatten(this.rules, executionContext, styleSheet);
    const css = stringifyRules(flatCSS, '');

    styleSheet.inject(this.componentId, css);
  }

  removeStyles(styleSheet: GlobalStyleSheet) {
    const { componentId } = this;
    if (styleSheet.hasId(componentId)) {
      styleSheet.remove(componentId);
    }
  }

  // TODO: overwrite in-place instead of remove+create?
  renderStyles(executionContext: Object, styleSheet: GlobalStyleSheet) {
    this.removeStyles(styleSheet);
    this.createStyles(executionContext, styleSheet);
  }
}
