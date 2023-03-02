import StyleSheet from '../sheet';
import { ExecutionContext, FlattenerResult, RuleSet, Stringifier } from '../types';
export default class GlobalStyle<Props extends object> {
    componentId: string;
    isStatic: boolean;
    rules: FlattenerResult<Props>;
    constructor(rules: RuleSet<Props>, componentId: string);
    createStyles(instance: number, executionContext: ExecutionContext & Props, styleSheet: StyleSheet, stylis: Stringifier): void;
    removeStyles(instance: number, styleSheet: StyleSheet): void;
    renderStyles(instance: number, executionContext: ExecutionContext & Props, styleSheet: StyleSheet, stylis: Stringifier): void;
}
