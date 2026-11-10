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
import { Text, TextInput, View } from 'react-native';
import type { ViewProps as RNViewProps } from 'react-native';
import styled, { StyledComponent } from '../native';
import bridgeStyled from '../native/web-bridge';

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

/**
 * `StyledComponent<Target, Props>` from the native entry resolves to the exact
 * type `styled(Target)<Props>` produces (assignable both directions), keeping the
 * target's props and the declared props. Native carries no hoisted-statics
 * intersection, so a wrapped-component case covers that difference.
 */
const scNativeTag = styled.View<{ $active?: boolean }>``;
const scNativeTagAnnotated: StyledComponent<typeof View, { $active?: boolean }> = scNativeTag;
const scNativeTagBack: typeof scNativeTag = scNativeTagAnnotated;
void scNativeTagBack;

export const ScNativeBox: StyledComponent<typeof View, { $active?: boolean }> = styled.View<{
  $active?: boolean;
}>``;
<ScNativeBox $active testID="box" />;
// @ts-expect-error `$active` is declared as boolean
<ScNativeBox $active="yes" />;
// @ts-expect-error `notAProp` belongs to neither the target nor the declaration
<ScNativeBox notAProp="x" />;
// The web `style` widening stays off for the native annotation as well.
// @ts-expect-error a CSS custom property is not a native style field
<ScNativeBox style={{ '--x': '1px' }} />;

const scNativeWrap = styled(TextInput)``;
const scNativeWrapAnnotated: StyledComponent<typeof TextInput> = scNativeWrap;
const scNativeWrapBack: typeof scNativeWrap = scNativeWrapAnnotated;
void scNativeWrapBack;

/**
 * `disabled` is not a prop of React Native's `TextInput`, but styled
 * `TextInput` accepts it as a boolean (it drives `:disabled` and makes the
 * input non-editable). Both entry spellings and `.attrs()` carry it; plain
 * `TextInput` and every other target stay as RN declares them.
 */
const NativeInput = styled.TextInput``;
const NativeInputFromRaw = styled(TextInput)``;
const NativeInputAttrs = styled.TextInput.attrs({ editable: true })``;
<NativeInput disabled />;
<NativeInput disabled={false} />;
<NativeInputFromRaw disabled />;
<NativeInputAttrs disabled />;
// @ts-expect-error `disabled` is a boolean
<NativeInput disabled="x" />;
// @ts-expect-error `disabled` is a boolean
<NativeInputFromRaw disabled="x" />;
// @ts-expect-error `disabled` is a boolean
<NativeInputAttrs disabled="x" />;
// @ts-expect-error the widening is keyed on TextInput: `View` has no `disabled`
<NativeBox disabled />;
// @ts-expect-error a plain `TextInput` still rejects `disabled`
<TextInput disabled />;
const NativeInputDeclared = styled.TextInput<{ $tone: 'warn' | 'ok' }>``;
<NativeInputDeclared $tone="ok" disabled />;
// @ts-expect-error declared props still constrain beside the widening
<NativeInputDeclared $tone="nope" disabled />;

/** The rn-web bridge's `styled.TextInput` takes `disabled` too. */
const BridgeInput = bridgeStyled.TextInput``;
<BridgeInput disabled />;
// @ts-expect-error `disabled` is a boolean
<BridgeInput disabled="x" />;

// `.attrs()` over an already-optional prop leaves the type unchanged.
const scNativeAttrs = styled.TextInput.attrs({ editable: true })<{ $x?: number }>``;
const scNativeAttrsAnnotated: StyledComponent<typeof TextInput, { $x?: number }> = scNativeAttrs;
const scNativeAttrsBack: typeof scNativeAttrs = scNativeAttrsAnnotated;
void scNativeAttrsBack;
