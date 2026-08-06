/**
 * Typing-related tests for the React Native entry (`styled-components/native`).
 * Compile-only: nothing here is executed, every statement is an assertion about
 * what the native typings resolve to, and the whole file is checked by
 *
 *   pnpm --filter styled-components test:types
 *
 * The web entry is covered in `types.tsx`. Native-only regressions belong here,
 * because both entries resolve target props through the same types and a change
 * to the component arm (the arm every native target takes) would otherwise pass
 * on web coverage alone.
 *
 * A rejected prop at a JSX call site reports TS2769 ("No overload matches this
 * call"), not TS2322: a styled component's call signature is two overloads, so
 * the real reason lives in the nested "Overload N of 2" detail.
 */
import React from 'react';
import { Text, View } from 'react-native';
import type { ViewProps as RNViewProps } from 'react-native';
import styled from '../native';

/**
 * The `style` widening is web-only. A native `style` takes a native style
 * object, which carries neither web CSS nor custom properties, so the widening
 * has to be gated on the runtime rather than applied to every target.
 *
 * Without the gate these two directives stop firing and surface as TS2578,
 * which is the whole point of anchoring on deliberate mismatches: a widened
 * `style` accepts both of these silently.
 */
const NativeBox = styled.View`
  flex: 1;
`;

// A real native style still works.
<NativeBox style={{ flex: 1, backgroundColor: 'red' }} />;
<NativeBox style={[{ flex: 1 }, { opacity: 0.5 }]} />;

// @ts-expect-error a CSS custom property is not a native style field
<NativeBox style={{ '--x': '1px' }} />;
// @ts-expect-error `float` is web-only CSS and has no native equivalent
<NativeBox style={{ float: 'left' }} />;

// Native targets stay introspectable: an unknown prop is still rejected.
// @ts-expect-error `notAPropOfView` is not a View prop
<NativeBox notAPropOfView={1} />;
<NativeBox testID="ok" />;

/** Declared props merge over the native target's props as they do on web. */
const Labeled = styled(Text)<{ $tone: 'warn' | 'ok' }>`
  color: ${p => (p.$tone === 'warn' ? 'red' : 'green')};
`;
<Labeled $tone="warn" numberOfLines={2} />;
// @ts-expect-error $tone is constrained to the declared union
<Labeled $tone="nope" />;

/** Interpolation props are typed, not silently widened to `any`. */
const Interpolated = styled.View<{ $size: number }>`
  width: ${p => {
    // @ts-expect-error $size is a number, so a string method is not available
    p.$size.toUpperCase();
    return p.$size;
  }}px;
`;
<Interpolated $size={4} />;

/** Wrapping a plain component whose props are declared with RN types. */
const Plain = (_props: RNViewProps & { children?: React.ReactNode }) => null;
const StyledPlain = styled(Plain)``;
<StyledPlain testID="x" />;
// @ts-expect-error still not a View prop
<StyledPlain notAProp="x" />;
