/**
 * Typing-related tests for the React Native entry (`styled-components/native`).
 * Compile-only -- there is no test runner here, and nothing in this file is
 * executed. Every statement is an assertion about what the native typings
 * resolve to, and the whole file is checked by:
 *
 *   pnpm --filter styled-components test:types
 *
 * The web entry is covered separately in `types.tsx`; keep native-only
 * regressions here so a change to the `AnyComponent` arm of `TargetProps` (the
 * arm every native target takes) cannot pass on web coverage alone.
 *
 * Two kinds of assertion appear below:
 *
 * 1. A bare JSX statement or typed const -- passes by compiling.
 * 2. `@ts-expect-error` with a comment naming the error expected. This is also
 *    how the "did not silently widen to `any`" assertions are written: `any`
 *    compiles clean, so a plain compile proves nothing about an interpolation
 *    parameter's type. Anchoring on a deliberate mismatch means a widen makes
 *    the directive stop firing and surfaces as TS2578 ("Unused
 *    '@ts-expect-error' directive").
 *
 * A rejected prop at a JSX call site reports TS2769 ("No overload matches this
 * call"), not TS2322: a styled component's call signature is two overloads (the
 * polymorphic one and the ForwardRefExoticComponent one), so the real reason
 * lives in the nested "Overload N of 2" detail. Each directive's comment states
 * that reason. The codes below were verified by deleting each directive and
 * reading what tsc actually emitted.
 */
import React, { useRef } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { PropsWithChildren } from 'react';
import type { TextProps as RNTextProps, ViewProps as RNViewProps } from 'react-native';
import styled, { DefaultTheme, StyledComponent } from '../native';

/**
 * Augment DefaultTheme so tests can reference theme properties. This is the
 * SAME augmentation target `types.tsx` and `test.d.ts` use -- interface
 * declarations merge, so the keys below simply add to theirs. Do not restate a
 * key another file already declares with a different type; that is the one way
 * these can collide.
 *
 * Every key must be optional. `EMPTY_OBJECT` (`Readonly<Dict<any>>`) is the
 * library's own default theme in `StyledComponent` and `StyledNativeComponent`,
 * and a required key on `DefaultTheme` makes that default stop being assignable
 * -- so a required key here fails the library's source, not this file. Read the
 * key through `NonNullable<...>` where a non-optional view is needed.
 */
declare module '../models/ThemeProvider' {
  interface DefaultTheme {
    COLORS?: { PRIMARY: string; TEXT: string };
    WEIGHT?: { 400: string; 700: string };
  }
}

/* ------------------------------------------------------------------------- *
 * The `style` widening is web-only. A native `style` takes a `ViewStyle`, so web
 * CSS and custom properties are rejected; `TargetProps` gates the widening on
 * its runtime parameter. Regression guard: on 6.4.2 through 6.4.4 both of the
 * rejections below compiled.
 * ------------------------------------------------------------------------- */

const NativeStyleView = styled.View``;
<NativeStyleView style={{ width: 10 }} />;
// @ts-expect-error `float` is web-only CSS and absent from ViewStyle
<NativeStyleView style={{ float: 'left' }} />;
// @ts-expect-error CSS custom properties are web-only
<NativeStyleView style={{ '--brand': 'red' }} />;

/**
 * Not a styled-components contract: `@types/react-native` 0.71 types
 * `FlexStyle['width']` as `number | string`, so a web length is accepted by RN's
 * own typing. A react-native bump that tightens this to `DimensionValue` stops
 * the line compiling, which is upstream news rather than a regression here.
 */
<NativeStyleView style={{ width: '3em' }} />;

/* ------------------------------------------------------------------------- *
 * Baseline: the shorthand aliases resolve their target's real props.
 * ------------------------------------------------------------------------- */

const BaseView = styled.View`
  background-color: red;
`;
<BaseView testID="view" pointerEvents="none" onLayout={() => {}} />;
<BaseView style={{ flex: 1 }} />;
// @ts-expect-error TS2769: `bogus` is not a ViewProps key. The native target must
// stay strictly typed -- if `ComponentPropsWithRef<typeof View>` ever collapsed to
// `{}` the un-introspectable-target fallback would accept anything here.
<BaseView bogus="nope" />;

const BaseText = styled.Text`
  color: blue;
`;
<BaseText numberOfLines={2} ellipsizeMode="tail" selectable>
  hello
</BaseText>;
// @ts-expect-error TS2769: `numberOfLines` is a number on TextProps.
<BaseText numberOfLines="two" />;
// @ts-expect-error TS2769: `bogus` is not a TextProps key.
<BaseText bogus="nope" />;

const BaseTextInput = styled.TextInput`
  color: black;
`;
<BaseTextInput
  placeholder="type here"
  value="x"
  onChangeText={next => next.trim()}
  secureTextEntry
  keyboardType="numeric"
/>;
// @ts-expect-error TS2769: `keyboardType` is a KeyboardTypeOptions union, not any string.
<BaseTextInput keyboardType="not-a-keyboard" />;
// @ts-expect-error TS2769: `bogus` is not a TextInputProps key.
<BaseTextInput bogus="nope" />;

/* ------------------------------------------------------------------------- *
 * Baseline: styled() wrapping a plain React Native component, and wrapping a
 * plain function component that happens to render one.
 * ------------------------------------------------------------------------- */

const WrappedView = styled(View)`
  padding: 4px;
`;
<WrappedView testID="wrapped" />;
// @ts-expect-error TS2769: props of the wrapped RN component are preserved.
<WrappedView bogus="nope" />;

const PlainRow = (props: RNViewProps & { label: string }) => <View {...props} />;
const StyledPlainRow = styled(PlainRow)`
  flex-direction: row;
`;
<StyledPlainRow label="row" testID="plain-row" />;
// @ts-expect-error TS2769: `label` is required by the wrapped component.
<StyledPlainRow testID="plain-row" />;

// Extending a native styled component keeps the base's props.
const ExtendedRow = styled(StyledPlainRow)<{ $dense?: boolean }>`
  opacity: ${props => (props.$dense ? 0.5 : 1)};
`;
<ExtendedRow label="row" $dense />;
// @ts-expect-error TS2769: `label` is still required on the extension.
<ExtendedRow $dense />;

/* ------------------------------------------------------------------------- *
 * Baseline: a declared transient prop reaches the interpolation with its
 * declared type, and stays strictly typed at the call site.
 * ------------------------------------------------------------------------- */

const TransientBox = styled.View<{ $size: number; $tone: 'muted' | 'strong' }>`
  width: ${props => props.$size}px;
  opacity: ${props => (props.$tone === 'muted' ? 0.5 : 1)};
`;
<TransientBox $size={12} $tone="muted" />;
// @ts-expect-error TS2769: `$size` is a number.
<TransientBox $size="12" $tone="muted" />;
// @ts-expect-error TS2769: `$tone` is a two-member literal union.
<TransientBox $size={12} $tone="loud" />;

// Presence anchor for the interpolation parameter: `$size` must arrive as
// `number`, not `any`.
const TransientBoxAnchored = styled.View<{ $size: number }>`
  width: ${props => {
    // @ts-expect-error TS2322: Type 'number' is not assignable to type 'string'.
    const leak: string = props.$size;
    return leak;
  }};
`;
<TransientBoxAnchored $size={12} />;

/* ------------------------------------------------------------------------- *
 * Baseline: attrs on a native component.
 * ------------------------------------------------------------------------- */

const AttrsView = styled.View.attrs({ testID: 'attrs-view', pointerEvents: 'none' as const })`
  flex: 1;
`;
<AttrsView />;
<AttrsView pointerEvents="auto" />;
// @ts-expect-error TS2769: attrs does not loosen the target's prop types.
<AttrsView pointerEvents="sideways" />;

const AttrsTextInput = styled.TextInput.attrs({ autoCorrect: false, placeholder: 'search' })`
  color: black;
`;
<AttrsTextInput />;
<AttrsTextInput placeholder="override" />;

// Function-form attrs reads the resolved props, including a transient one
// declared through the attrs generic.
const AttrsFromProps = styled.Text.attrs<{ $emphasis?: boolean }>(props => ({
  numberOfLines: props.$emphasis ? 1 : 3,
}))``;
<AttrsFromProps $emphasis>hello</AttrsFromProps>;

// @ts-expect-error TS2353: attrs must reject a key the target does not declare.
const AttrsUnknownKey = styled.View.attrs({ bogus: 42 })``;
void AttrsUnknownKey;

/* ------------------------------------------------------------------------- *
 * Baseline: `as` / `forwardedAs`. On native, `StyledTarget<'native'>` is
 * `AnyComponent` -- there are no intrinsic tag strings to name, so a target is
 * always a component reference.
 * ------------------------------------------------------------------------- */

const PolyView = styled.View`
  margin: 2px;
`;
<PolyView as={Text} numberOfLines={1}>
  rendered as Text
</PolyView>;
<PolyView forwardedAs={Text} />;
// @ts-expect-error TS2769: native has no intrinsic tag targets, so a string is not a target.
<PolyView as="View" />;

/* ------------------------------------------------------------------------- *
 * C09 / #4302 (closed as a duplicate of #4076): `.attrs()` on a native styled
 * component must make the wrapped component's required prop optional, and
 * `children` must still be accepted. The reported error rejected
 * `{ children: string }` wholesale.
 *
 * The reporter's snippet renders a `<div>` -- it is a web component compiled
 * under the native entry, and is left that way: the assertion is about attrs
 * and the wrapped component's props, not about the render target.
 * ------------------------------------------------------------------------- */

const RequiredAttrComponent = (props: PropsWithChildren<{ requiredAttr: boolean }>) => (
  <div {...props}>{props.children}</div>
);

const RequiredAttrProvided = styled(RequiredAttrComponent).attrs({ requiredAttr: true })``;
<RequiredAttrProvided>Bla</RequiredAttrProvided>;
// Providing it explicitly still works, and still type-checks.
<RequiredAttrProvided requiredAttr={false}>Bla</RequiredAttrProvided>;
// @ts-expect-error TS2769: attrs made it optional, not untyped.
<RequiredAttrProvided requiredAttr="yes" />;

// Without attrs the prop stays required, so the attrs behavior above is not
// just the prop having been optional all along.
const RequiredAttrUnprovided = styled(RequiredAttrComponent)``;
// @ts-expect-error TS2769: `requiredAttr` is required when attrs does not supply it. The nested
// detail here is the reporter's verbatim diagnostic -- "Property 'requiredAttr' is missing in type
// '{ children: string; }'" -- so this line is also the proof that the case above exercises the fix
// rather than a prop that was optional all along.
<RequiredAttrUnprovided>Bla</RequiredAttrUnprovided>;

/* ------------------------------------------------------------------------- *
 * C25 / #4143 (fixed in 6.4.0-prerelease.0): `ref` on a native styled
 * component. Both spellings must compile -- the reporter's "does not work"
 * (`styled.TextInput`) and his "does work" (`styled(TextInput)`) -- and the
 * pair is the diagnostic value of the case.
 * ------------------------------------------------------------------------- */

const RefTextInput = styled.TextInput``;

function RefApp(): React.JSX.Element {
  const ref = useRef(null);

  return <RefTextInput ref={ref} />;
}
void RefApp;

// The control from the same comment: "This example does work".
const RefTextInputViaCall = styled(TextInput)``;
const refAppViaCall = () => {
  const ref = useRef<TextInput>(null);
  return <RefTextInputViaCall ref={ref} />;
};
void refAppViaCall;

/**
 * wojtekmaj's follow-up on the same issue: an unannotated ref callback must
 * infer its parameter rather than emit TS7006.
 *
 * The `ref` parameter below MUST stay unannotated. Annotating it is exactly
 * what masks the failure, so do not "fix" a future error here by adding a type.
 */
const RefCallbackView = styled.View<{ active?: boolean }>``;
<RefCallbackView
  active
  ref={ref => {
    ref;
  }}
/>;

/* ------------------------------------------------------------------------- *
 * C26 / #4184 (fixed around 6.1.0): `styled.Text<Props>` on native must accept
 * the declared props at the call site, and the interpolation parameters must be
 * typed -- `theme` as the augmented `DefaultTheme`, not `any`.
 * ------------------------------------------------------------------------- */

interface ThemedTextProps {
  color: keyof NonNullable<DefaultTheme['COLORS']>;
  size: number;
  weight: keyof NonNullable<DefaultTheme['WEIGHT']>;
}

const ThemedText = styled.Text<ThemedTextProps>`
  font-family: ${({ theme, weight }) =>
    theme.WEIGHT ? `Inter_${theme.WEIGHT[weight]}` : 'Inter_400'};
  color: ${({ theme, color }) => (theme.COLORS ? theme.COLORS[color] : 'black')};
  font-size: ${({ size }) => (size ? `${size}px` : '16px')};
`;

<ThemedText color="TEXT" size={12} weight={400}>
  children
</ThemedText>;
// @ts-expect-error TS2769: `color` is keyof NonNullable<DefaultTheme['COLORS']>.
<ThemedText color="NOT_A_COLOR" size={12} weight={400} />;
// @ts-expect-error TS2769: `size` is required.
<ThemedText color="TEXT" weight={400} />;

// Presence anchor for the theme half of the interpolation parameter:
// `theme.COLORS.TEXT` is a string, so assigning it to a number must error.
// Silence would mean `theme` widened to `any`.
const ThemedTextAnchored = styled.Text<ThemedTextProps>`
  color: ${({ theme }) => {
    if (!theme.COLORS) return 'black';
    // @ts-expect-error TS2322: Type 'string' is not assignable to type 'number'.
    const leak: number = theme.COLORS.TEXT;
    return leak;
  }};
`;
void ThemedTextAnchored;

/* ------------------------------------------------------------------------- *
 * C38 / #3537: the native interpolation parameter must resolve to
 * `ExecutionContext & MyTextProps`, not `any`.
 * ------------------------------------------------------------------------- */

type PrimaryTextProps = { primary: string };

const PrimaryText = styled.Text<PrimaryTextProps>`
  color: ${props => props.primary};
`;
<PrimaryText primary="red">hello</PrimaryText>;

// Presence anchor for the declared-prop half of the same parameter.
const PrimaryTextAnchored = styled.Text<PrimaryTextProps>`
  color: ${props => {
    // @ts-expect-error TS2322: Type 'string' is not assignable to type 'number'.
    const leak: number = props.primary;
    return leak;
  }};
`;
void PrimaryTextAnchored;

// The theme half of `ExecutionContext` must be reachable from the same
// parameter as the declared props.
const PrimaryThemedText = styled.Text<PrimaryTextProps>`
  color: ${props => (props.theme.COLORS ? props.theme.COLORS.PRIMARY : props.primary)};
`;
void PrimaryThemedText;

/* ------------------------------------------------------------------------- *
 * The native target's own props survive being read back out through
 * `React.ComponentProps`, the same way the web entry's do.
 * ------------------------------------------------------------------------- */

type ExtractedTextProps = React.ComponentProps<typeof BaseText>;
const extractedNumberOfLines: ExtractedTextProps['numberOfLines'] = 3;
void extractedNumberOfLines;
const extractedTargetProps: RNTextProps['ellipsizeMode'] = 'tail';
void extractedTargetProps;

/* ------------------------------------------------------------------------- *
 * `StyledComponent<Target, Props>` from the native entry annotates a native
 * styled-component export the same way the web entry's does. As on web, the
 * annotation is proven to be the exact type `styled(Target)<Props>` produces:
 * the inferred component assigns to the annotation and back. Native carries no
 * hoisted-statics intersection, so a target-wrap case exercises that difference.
 * ------------------------------------------------------------------------- */
const _scNativeTag = styled.View<{ $active?: boolean }>``;
const _scNativeTagAnnotated: StyledComponent<typeof View, { $active?: boolean }> = _scNativeTag;
const _scNativeTagBack: typeof _scNativeTag = _scNativeTagAnnotated;
void _scNativeTagBack;

const _scNativeWrap = styled(TextInput)``;
const _scNativeWrapAnnotated: StyledComponent<typeof TextInput> = _scNativeWrap;
const _scNativeWrapBack: typeof _scNativeWrap = _scNativeWrapAnnotated;
void _scNativeWrapBack;

// `.attrs()` follows the same rules as web: an already-optional backfilled prop
// leaves the type unchanged.
const _scNativeAttrs = styled.TextInput.attrs({ editable: true })<{ $x?: number }>``;
const _scNativeAttrsAnnotated: StyledComponent<typeof TextInput, { $x?: number }> = _scNativeAttrs;
const _scNativeAttrsBack: typeof _scNativeAttrs = _scNativeAttrsAnnotated;
void _scNativeAttrsBack;
