import {
  BaseObject,
  DefaultTheme,
  Interpolation,
  NoInfer,
  RuleSet,
  StyledObject,
  StyleFunction,
  Styles,
} from '../types';
import { EMPTY_ARRAY } from '../utils/empties';
import flatten from '../utils/flatten';
import interleave from '../utils/interleave';
import isFunction from '../utils/isFunction';
import isPlainObject from '../utils/isPlainObject';

/**
 * Used when flattening object styles to determine if we should
 * expand an array of styles.
 */
const addTag = <T extends RuleSet<any, any>>(arg: T): T & { isCss: true } =>
  Object.assign(arg, { isCss: true } as const);

function css<Props extends object = BaseObject, Theme extends object = DefaultTheme>(
  styles: Styles<Props, Theme>,
  ...interpolations: Interpolation<Props, Theme>[]
): RuleSet<Props, Theme>;
function css<Props extends object, Theme extends object = DefaultTheme>(
  styles: Styles<NoInfer<Props>, Theme>,
  ...interpolations: Interpolation<NoInfer<Props>, Theme>[]
): RuleSet<NoInfer<Props>, Theme>;
function css<Props extends object = BaseObject, Theme extends object = DefaultTheme>(
  styles: Styles<NoInfer<Props>, Theme>,
  ...interpolations: Interpolation<NoInfer<Props>, Theme>[]
): RuleSet<NoInfer<Props>, Theme> {
  if (isFunction(styles) || isPlainObject(styles)) {
    const styleFunctionOrObject = styles as
      | StyleFunction<Props, Theme>
      | StyledObject<Props, Theme>;

    return addTag(
      flatten<Props, Theme>(
        interleave<Props>(EMPTY_ARRAY, [styleFunctionOrObject, ...interpolations]) as Interpolation<
          object,
          Theme
        >
      )
    );
  }

  const styleStringArray = styles as TemplateStringsArray;

  if (
    interpolations.length === 0 &&
    styleStringArray.length === 1 &&
    typeof styleStringArray[0] === 'string'
  ) {
    return flatten<Props, Theme>(styleStringArray);
  }

  return addTag(
    flatten<Props, Theme>(
      interleave<Props>(styleStringArray, interpolations) as Interpolation<object, Theme>
    )
  );
}

export default css;
