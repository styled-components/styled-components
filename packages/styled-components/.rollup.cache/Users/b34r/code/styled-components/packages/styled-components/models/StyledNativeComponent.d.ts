import type { ExecutionProps, IInlineStyleConstructor, IStyledComponent, IStyledComponentFactory, NativeTarget, RuleSet, StyledOptions } from '../types';
declare const _default: (InlineStyle: IInlineStyleConstructor<any>) => <Target extends NativeTarget, OuterProps extends ExecutionProps, Statics extends object = object>(target: Target, options: StyledOptions<"native", OuterProps>, rules: RuleSet<OuterProps>) => IStyledComponent<"native", Target, OuterProps & object> & Statics & object;
export default _default;
