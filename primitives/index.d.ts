import * as ReactPrimitives from "react-primitives";
import * as React from "react";
import { StatelessComponent, ComponentClass } from "react";

export {
  ThemeProps,
  ThemeProvider,
  Interpolation,
  InterpolationValue,
  InterpolationFunction,
  OuterStyledProps,
  StyledFunction,
  BaseStyledInterface,
  css,
  withTheme,
} from "..";

import { StyledFunction, BaseStyledInterface } from "..";

type Component<P> = ComponentClass<P> | StatelessComponent<P>;

export type ReactPrimitivesStyledFunction<P> = StyledFunction<P>;

export interface StyledInterface extends BaseStyledInterface {
  Image: ReactPrimitivesStyledFunction<ReactPrimitives.Image>;
  Text: ReactPrimitivesStyledFunction<ReactPrimitives.Text>;
  Touchable: ReactPrimitivesStyledFunction<ReactPrimitives.Touchable>;
  View: ReactPrimitivesStyledFunction<ReactPrimitives.View>;
}

declare const styled: StyledInterface;

export default styled;
