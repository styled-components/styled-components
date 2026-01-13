import StyleSheet from '../sheet';
import { ExecutionContext, RuleSet, Stringifier } from '../types';
import flatten from '../utils/flatten';
import isStaticRules from '../utils/isStaticRules';
import { joinStringArray } from '../utils/joinStrings';

export default class GlobalStyle<Props extends object> {
  componentId: string;
  isStatic: boolean;
  rules: RuleSet<Props>;

  constructor(rules: RuleSet<Props>, componentId: string) {
    this.rules = rules;
    this.componentId = componentId;
    this.isStatic = isStaticRules(rules);

    // pre-register the first instance to ensure global styles
    // load before component ones
    StyleSheet.registerId(this.componentId + 1);
  }

  createStyles(
    instance: number,
    executionContext: ExecutionContext & Props,
    styleSheet: StyleSheet,
    stylis: Stringifier
  ): void {
    const flatCSS = joinStringArray(
      flatten(this.rules as RuleSet<object>, executionContext, styleSheet, stylis) as string[]
    );
    const css = stylis(flatCSS, '');
    const id = this.componentId + instance;

    // NOTE: We use the id as a name as well, since these rules never change
    styleSheet.insertRules(id, id, css);
  }

  removeStyles(instance: number, styleSheet: StyleSheet): void {
    styleSheet.clearRules(this.componentId + instance);
  }

  renderStyles(
    instance: number,
    executionContext: ExecutionContext & Props,
    styleSheet: StyleSheet,
    stylis: Stringifier
  ): void {
    if (instance > 2) StyleSheet.registerId(this.componentId + instance);

    const id = this.componentId + instance;

    // For static styles, only inject once - don't remove and re-add on every render
    // This prevents issues with React 18/19 concurrent rendering where the brief
    // removal of styles could cause visual glitches or interfere with style hoisting
    if (this.isStatic && styleSheet.hasNameForId(id, id)) {
      return;
    }

    // NOTE: Remove old styles, then inject the new ones
    this.removeStyles(instance, styleSheet);
    this.createStyles(instance, executionContext, styleSheet, stylis);
  }
}
