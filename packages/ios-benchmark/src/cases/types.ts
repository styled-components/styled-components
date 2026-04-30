import type { ComponentType } from 'react';

export interface BoxProps {
  $color?: number;
  $layout?: 'column' | 'row';
  $outer?: boolean;
  $fixed?: boolean;
  children?: any;
}

export interface WrapperProps {
  children?: any;
}

export interface BenchComponents {
  Box: ComponentType<BoxProps>;
  Wrapper: ComponentType<WrapperProps>;
  // Static-CSS box: identical fixed style on every render. For SC impls this
  // routes through the lite path (eligible iff CSS is provably static + no
  // attrs + no shouldForwardProp). For vanilla it's just a `<View>` with a
  // pre-built StyleSheet ID.
  BoxStatic: ComponentType<{ children?: any }>;
}
