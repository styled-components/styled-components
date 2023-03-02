import StyleSheet from '../sheet';
import { RuleSet, Stringifier } from '../types';
/**
 * ComponentStyle is all the CSS-specific stuff, not the React-specific stuff.
 */
export default class ComponentStyle {
    baseHash: number;
    baseStyle: ComponentStyle | null | undefined;
    componentId: string;
    isStatic: boolean;
    names: string[];
    rules: RuleSet<any>;
    staticRulesId: string;
    constructor(rules: RuleSet<any>, componentId: string, baseStyle?: ComponentStyle);
    generateAndInjectStyles(executionContext: Object, styleSheet: StyleSheet, stylis: Stringifier): string;
}
