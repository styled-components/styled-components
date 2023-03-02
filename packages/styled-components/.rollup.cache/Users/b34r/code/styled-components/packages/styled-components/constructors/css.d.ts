import { Interpolation, RuleSet, Styles } from '../types';
declare function css(styles: Styles<object>, ...interpolations: Interpolation<object>[]): RuleSet<object>;
declare function css<Props extends object>(styles: Styles<Props>, ...interpolations: Interpolation<Props>[]): RuleSet<Props>;
export default css;
