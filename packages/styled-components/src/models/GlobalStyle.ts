import StyleSheet from '../sheet';
import { FlattenerResult, RuleSet, Stringifier } from '../types';
import flatten from '../utils/flatten';
import isStaticRules from '../utils/isStaticRules';

export default class GlobalStyle {
  componentId: string;
  isStatic: boolean;
  rules: FlattenerResult;

  constructor(rules: RuleSet, componentId: string) {
    this.rules = rules;
    this.componentId = componentId;
    this.isStatic = isStaticRules(rules);

    // pre-register the first instance to ensure global styles
    // load before component ones
    StyleSheet.registerId(this.componentId + 1);
  }

  createStyles(
    instance: number,
    executionContext: Object,
    styleSheet: StyleSheet,
    stylis: Stringifier
  ): void {
    const flatCSS = flatten(this.rules, executionContext, styleSheet, stylis) as string[];
    const css = stylis(flatCSS.join(''), '');
    const id = this.componentId + instance;

    // NOTE: We use the id as a name as well, since these rules never change
    styleSheet.insertRules(id, id, css);
  }

  removeStyles(instance: number, styleSheet: StyleSheet): void {
    styleSheet.clearRules(this.componentId + instance);
  }

  renderStyles(
    instance: number,
    executionContext: Object,
    styleSheet: StyleSheet,
    stylis: Stringifier
  ): void {
    if (instance > 2) StyleSheet.registerId(this.componentId + instance);

    // NOTE: Remove old styles, then inject the new ones
    this.removeStyles(instance, styleSheet);
    this.createStyles(instance, executionContext, styleSheet, stylis);
  }
}
