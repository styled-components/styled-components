import type { IStyledComponentFactory, RuleSet, StyledOptions, WebTarget } from '../types';
declare function createStyledComponent<Target extends WebTarget, OuterProps extends object, Statics extends object = object>(target: Target, options: StyledOptions<'web', OuterProps>, rules: RuleSet<OuterProps>): ReturnType<IStyledComponentFactory<'web', Target, OuterProps, Statics>>;
export default createStyledComponent;
