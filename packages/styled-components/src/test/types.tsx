/**
 * This file is meant for typing-related tests that don't need to go through Jest.
 * Run via: pnpm --filter styled-components test:types
 */
import React from 'react';
import {
  css,
  CSSProp,
  CustomStyle,
  ExecutionContext,
  Interpolation,
  IStyledComponent,
  RuleSet,
  StyledObject,
  WebTarget,
  withTheme,
} from '../index';
import styled from '../index-standalone';
import { DataAttributes } from '../types';
import { VeryLargeUnionType } from './veryLargeUnionType';

// Augment DefaultTheme so tests can reference theme properties.
// This augmentation is scoped to test:types via tsconfig.test-types.json
// and does not affect the main build.
declare module '../models/ThemeProvider' {
  interface DefaultTheme {
    spacing?: string;
    waz?: string;
  }
}

/**
 * Prop inference when using forwardRef
 * https://github.com/styled-components/styled-components/issues/3800#issuecomment-1313445733
 */
const ComponentBase = React.forwardRef<HTMLDivElement, { prop: 'foo' }>(
  ({ prop, ...props }, ref) => (
    <div ref={ref} {...props}>
      {prop}
    </div>
  )
);

const Component1 = styled(ComponentBase)`
  border: 1px solid black;
`;

// prop should resolve to "foo"
<Component1 prop="foo" />;

/**
 * interpolated component type incorrectly appended to wrapper
 * https://github.com/styled-components/styled-components/issues/3800#issuecomment-1296723840
 */
const Button = styled.button<{ foo: boolean }>``;
const Wrapper = styled.div`
  ${Button} > * {
    color: red;
  }
`;

const Component2 = () => {
  return (
    // Wrapper should not be influenced by Button's types
    <Wrapper>
      <Button as="video" foo loop>
        test
      </Button>
    </Wrapper>
  );
};

/**
 * theme prop getting messed with when attrs is used
 * https://github.com/styled-components/styled-components/issues/3800#issuecomment-1413624609
 */
const Example = styled.div.attrs({
  title: 'test',
})`
  margin-top: ${props => props.theme?.spacing};
`;

// Same as above but without any attrs values - theme should still work
const Example2 = styled.div.attrs({})`
  margin-top: ${props => props.theme?.spacing};
`;

/**
 * `css` prop
 */
declare module 'react' {
  interface Attributes {
    css?: CSSProp | undefined;
  }
}

<div
  css={css`
    color: blue;
  `}
/>;

<div
  css={css`
    color: ${Math.random() > 0.5 ? 'blue' : 'red'};
  `}
/>;

interface ColorizedComponentProps {
  color: string;
}
function ColorizedComponent(props: ColorizedComponentProps) {
  return null;
}

<ColorizedComponent
  color="blue"
  css={css<ColorizedComponentProps>`
    color: ${props => props.color};
  `}
/>;

/** forwardedAs should be a valid prop */
const ForwardedTo = styled.button``;
const ForwardedThrough = styled(ForwardedTo)``;
// href is inferred from "forwardedAs"
<ForwardedThrough forwardedAs="a" href="#" />;

const RuntimePropTest = styled.button<{ color?: 'indigo' }>``;
const RuntimePropOverrideTest = styled.button<{ color?: 'cerulean' }>``;
const RuntimePropDeepestOverrideTest = styled.button<{ color?: 'vermillion' }>``;
// @ts-expect-error color should be "indigo" | undefined
<RuntimePropTest color="red" />;
// @ts-expect-error wrong type entirely
<RuntimePropTest color />;
// ok
<RuntimePropTest color="indigo" />;

// TODO(#4305): should error (color should be "cerulean" | undefined) but the
// polymorphic overload doesn't narrow custom prop types from the `as` target.
// Narrowing DOES work for standard HTML props (e.g., as="a" adds href).
<RuntimePropTest as={RuntimePropOverrideTest} color="indigo" />;
// ok
<RuntimePropTest as={RuntimePropOverrideTest} color="cerulean" />;

<RuntimePropTest
  as={RuntimePropOverrideTest}
  forwardedAs={RuntimePropDeepestOverrideTest}
  // @ts-expect-error "as" wins over "forwardedAs" for prop conflicts
  color="vermillion"
/>;
// ok
<RuntimePropTest
  as={RuntimePropOverrideTest}
  forwardedAs={RuntimePropDeepestOverrideTest}
  color="cerulean"
/>;

// SVG generating overly-complex typings
const MySVG = styled.svg.attrs({
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 50 50',
})`
  display: block;
`;

interface UnstyledComponentProps {
  foo: number;
}

const UnstyledComponent = (_props: UnstyledComponentProps) => {
  return <></>;
};
<UnstyledComponent foo={42} />;

// Styled component of unstyled component should inherit props
const StyledComponent = styled(UnstyledComponent)`
  color: ${props => props.foo};
`;
<StyledComponent foo={42} />;
// @ts-expect-error UnstyledComponent didn't allow children, so neither does this one
<StyledComponent foo={42}>children allowed</StyledComponent>;

// Inherited component of styled component should inherit props too
const InheritedStyledComponent = styled(StyledComponent)``;
<InheritedStyledComponent foo={42} />;
// @ts-expect-error UnstyledComponent didn't allow children, so neither does this one
<InheritedStyledComponent foo={42}>children allowed</InheritedStyledComponent>;

// Mentioning another styled component within interpolation should not cause
// this styled component to inherit its props (in other words, this div still has custom props)
const DivWithoutProps = styled.div`
  ${StyledComponent} {
    display: block;
  }
`;
<DivWithoutProps />;
<DivWithoutProps>children allowed</DivWithoutProps>;

// Mentioning another styled component within interpolation should not cause
// this styled component to inherit its props (in other words, this div only has waz prop)
const DivWithProps = styled.div<{ waz: number; bar?: 'baz' }>`
  ${StyledComponent} {
    display: block;
  }

  color: ${props => props.waz};
`;
<DivWithProps waz={42} />;
<DivWithProps waz={42}>children allowed</DivWithProps>;
// @ts-expect-error Div should not have inherited foo
<DivWithProps foo={42} waz={42} />;
// @ts-expect-error Div requires waz
<DivWithProps />;

// Inherited component of styled component should inherit props too
const InheritedDivWithProps = styled(DivWithProps)`
  color: ${props => props.waz};
`;
<InheritedDivWithProps waz={42}>test</InheritedDivWithProps>;
// @ts-expect-error InheritedDiv inherited the required waz prop
<InheritedDivWithProps />;

// @ts-expect-error bar must be "baz"
<InheritedDivWithProps waz={42} bar="foo" />;

/** StyledObject should accept undefined properties
 * https://github.com/styled-components/styled-components/issues/3800#issuecomment-1548941843
 */
interface MyStyle extends StyledObject<object> {
  fontSize: string;
  lineHeight: string;
  textTransform?: StyledObject<object>['textTransform'];
}

const DivWithRequiredProps = styled.div.attrs<{ foo?: number; bar: string }>({
  foo: 42, // Providing required prop foo, which makes it optional
})``;

// foo can still be provided
<DivWithRequiredProps foo={45} bar="meh" />;
// but is optional
<DivWithRequiredProps bar="meh" />;
// TODO: bar should be required here but explicit generics on .attrs<>()
// cause props to be re-extracted via ComponentPropsWithRef, losing required status.
<DivWithRequiredProps />;

const DivWithUnfulfilledRequiredProps = styled.div<{ foo?: number; bar: string }>``;

// same test as above but with a wrapped, typed component
const RequiredPropsProvidedAsAttrs = styled(DivWithUnfulfilledRequiredProps).attrs({
  foo: 42, // Providing required prop foo, which makes it optional
})``;

// foo prop is optional
<RequiredPropsProvidedAsAttrs bar="bar" />;
// Can still provide foo if we want
<RequiredPropsProvidedAsAttrs foo={22} bar="bar" />;
// @ts-expect-error bar is still required
<RequiredPropsProvidedAsAttrs />;

/** Attrs should not expect all props to be provided (even if they are required)
 * https://github.com/styled-components/styled-components/issues/3800#issuecomment-1548941843
 */
const AttrRequiredTest = styled(DivWithUnfulfilledRequiredProps).attrs<
  DataAttributes & { bar?: string }
>({
  // Should not have to provide foo within attrs
  bar: 'hello',
  // Should allow hyphenated props
  'data-test': 42,
})``;
<AttrRequiredTest data-yeah="ok" foo={42} bar="bar" />;
// Bar was defaulted in attrs
<AttrRequiredTest foo={42} />;
// foo is not required
<AttrRequiredTest bar="bar" />;
// foo and bar are both no longer required
<AttrRequiredTest />;

const AttrRequiredTest2 = styled(DivWithUnfulfilledRequiredProps).attrs({
  // @ts-expect-error foo must be a number
  foo: 'not a number',
})``;

const AttrRequiredTest3 = styled(DivWithUnfulfilledRequiredProps).attrs<{ newProp: number }>({
  // Should allow props defined within attrs generic arg
  newProp: 42,
})``;
<AttrRequiredTest3 foo={42} bar="bar" newProp={42} />;

const AttrRequiredTest4 = styled(DivWithUnfulfilledRequiredProps).attrs({
  // @ts-expect-error Should not allow unknown props
  waz: 42,
})``;

/** Intrinsic props and ref are being incorrectly types when using `as`
 * https://github.com/styled-components/styled-components/issues/3800#issuecomment-1548941843
 */
const Text = styled.p``;
// @ts-expect-error Can't treat paragraph element as label element
<Text onCopy={(e: React.ClipboardEvent<HTMLLabelElement>) => {}} />;
<Text
  as="label"
  ref={(el: HTMLLabelElement | null) => {}}
  onCopy={(e: React.ClipboardEvent<HTMLLabelElement>) => {}}
/>;
// @ts-expect-error As prop should change the ref type to HTMLVideoElement
<Text as="video" ref={(e: HTMLLabelElement | null) => {}} />;
// TODO(#4305): should error (ref should narrow to HTMLLabelElement via as="label")
// but ForwardRefExoticComponent base signature accepts any ref type.
<Text as="label" ref={(e: HTMLParagraphElement | null) => {}} />;

const AttrObjectAsLabel = styled(Text).attrs({ as: 'label' })``;
<AttrObjectAsLabel
  ref={(el: HTMLLabelElement | null) => {}}
  onCopy={(e: React.ClipboardEvent<HTMLLabelElement>) => {}}
/>;
// @ts-expect-error Can't provide unknown props
<AttrObjectAsLabel waz={42} />;

const AttrFunctionAsLabel = styled(Text).attrs(() => ({ as: 'label' }))``;
<AttrFunctionAsLabel
  ref={(el: HTMLLabelElement | null) => {}}
  onCopy={(e: React.ClipboardEvent<HTMLLabelElement>) => {}}
/>;
// @ts-expect-error Can't provide unknown props
<AttrFunctionAsLabel waz={42} />;

/**
 * Using IStyledComponent as the casted type of a functional component won't retain intrinsic prop types once styled
 * https://github.com/styled-components/styled-components/issues/3800#issuecomment-1548941843
 */
const StyledDiv = styled.div``;

const CustomComponent = (({ ...props }) => {
  return <StyledDiv {...props} />;
}) as IStyledComponent<'web', React.JSX.IntrinsicElements['div']>;

const StyledCustomComponent = styled(CustomComponent)``;

<StyledCustomComponent className="class" />;

// Performance test
interface VeryLargeUnionProps {
  foo: VeryLargeUnionType; // Comment out this line to compare performance
}

const UnstyledComponentVeryLargeUnion = (_props: VeryLargeUnionProps) => {
  return <></>;
};

const StyledComponentVeryLargeUnion = styled(UnstyledComponentVeryLargeUnion)`
  // Multiple template strings helps illustrate possible perf issue
  color: ${props => props.theme?.waz || 'black'};
  color: ${props => props.theme?.waz || 'black'};
  color: ${props => props.theme?.waz || 'black'};
  color: ${props => props.theme?.waz || 'black'};
  color: ${props => props.theme?.waz || 'black'};
  color: ${props => props.theme?.waz || 'black'};
  color: ${props => props.theme?.waz || 'black'};
  color: ${props => props.theme?.waz || 'black'};
  color: ${props => props.theme?.waz || 'black'};
  color: ${props => props.theme?.waz || 'black'};
`;

// Can provide div props into attrs
const AttrFunctionRequiredTest2 = styled.div.attrs(_ => ({
  color: '',
}))``;

// Can provide purely custom props
const AttrFunctionRequiredTest3 = styled.div.attrs<DataAttributes>(_ => ({
  'data-test': 42,
}))``;

// @ts-expect-error Cannot provide unknown attributes
const AttrFunctionRequiredTest4 = styled.div.attrs(_ => ({
  waz: 42,
}))``;

const AttrFunctionRequiredTest5 = styled(DivWithUnfulfilledRequiredProps).attrs(props => ({
  foo: props.foo ? Math.round(props.foo) : 42,
}))``;

// CSSProp support for different things
<Button css="padding: 0.5em 1em;" foo />;
type CSSPropTestType = { color?: string; css?: CSSProp };
styled.div<CSSPropTestType>(_ => ({ css: 'color: red;' }));
styled.div<CSSPropTestType>(_ => ({ css: { color: 'red' } }));
styled.div<CSSPropTestType>(_ => ({ css: { height: '42px' } }));
styled.div<CSSPropTestType>(_ => ({ css: { height: 42 } }));
styled.div<CSSPropTestType>(_ => ({ css: () => ({ color: 'red' }) }));
styled.div<CSSPropTestType>(_ => ({
  css: css`
    color: red;
  `,
}));

styled.div<CSSPropTestType>(p => ({
  css: css<Omit<CSSPropTestType, 'css'>>`
    color: ${p => p.color || 'red'};
  `,
}));

// object styles
styled.div({ color: 'red', '@media (min-width: 500px)': { fontSize: '11px' } });

// object styles referencing another component
styled.div({ [AttrFunctionRequiredTest5]: { color: 'red' } });

type TextProps = React.PropsWithChildren<{
  color: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}>;

const sizeMap = {
  sm: '10px',
  md: '14px',
  lg: '16px',
} as const;

const Text2 = styled('span')<TextProps>(({ color, size }) => ({
  color: color === 'primary' ? '#444' : color === 'secondary' ? 'maroon' : 'black',
  fontSize: size && sizeMap[size],
}));

type ExtendingTextProps = React.PropsWithChildren<{ hasResult: boolean }>;
const ExtendingText = styled(Text2)<ExtendingTextProps>(({ hasResult }) => ({
  opacity: !hasResult ? '100%' : '50%',
}));

const StylingText = styled(Text2)({
  display: 'block',
  margin: '10px 0',
});

/**
 * Event typings
 */

const ButtonEventTest = styled.button``;

const ButtonEventTestExample = () => <ButtonEventTest onClick={e => console.log(e)} />;

/**
 * Using "css" result as an interpolation value in a styled(Component)
 * https://github.com/styled-components/styled-components/issues/4099
 */
type Props = {
  $size: number;
  $color: string;
};

const sizeStyles = css<Props>`
  font-size: ${props => props.$size}px;
`;

styled.div<Props>`
  color: ${props => props.$color};
  ${sizeStyles};
`;

/**
 * StyleFunction prop types when a StyleFunction returns another StyleFunction and prop types are provided
 */
type PropsWithVariant = {
  variant: 'primary' | 'secondary';
};

function getStyle(p: PropsWithVariant) {
  return p.variant === 'primary' ? 'blue' : 'green';
}

styled.div<PropsWithVariant>`
  color: ${p => p => getStyle(p)};
`;

/**
 * Styled object as function return value when prop types are provided
 */
styled.div<PropsWithVariant>`
  ${p => ({
    color: 'blue',
  })};
`;

const TargetWithStaticProperties = (p: React.PropsWithChildren<{}>) => <div {...p} />;
TargetWithStaticProperties.foo = 'bar';

const StyledTargetWithStaticProperties = styled(TargetWithStaticProperties)``;
StyledTargetWithStaticProperties.foo;

// Untyped ref callback must infer the element type, not `any` (#5687)
const InferredRefDiv = styled.div``;
<InferredRefDiv
  ref={(ref: HTMLDivElement) => {
    ref;
  }}
/>;

// Ref callback inference must survive spread of ComponentPropsWithoutRef (#5687)
const StyledCheckbox = styled.input``;
type CheckboxProps = React.ComponentPropsWithoutRef<typeof StyledCheckbox>;
const checkboxProps: CheckboxProps = { value: 'on' };
<StyledCheckbox
  // The ref callback MUST remain untyped - the bug is that TS can't infer the
  // parameter type when props are spread. Adding an explicit type annotation
  // (e.g. `ref: HTMLInputElement`) masks the failure. Do not "fix" by adding one.
  ref={ref => {
    ref;
  }}
  {...checkboxProps}
/>;

/**
 * forwardedAs ref typing
 */
const StyledCard = styled.div``;

const App = () => {
  const listRef = React.useRef<HTMLUListElement>(null);
  return (
    <StyledCard forwardedAs="ul" ref={listRef}>
      {' '}
      <li>One</li>
      <li>Two</li>
      <li>Three</li>
    </StyledCard>
  );
};

/**
 * attrs accepts css variables via style prop
 */
const DivWithCSSVariable = styled.div.attrs(() => ({
  style: { '--dim': 'yes' },
}))``;

const DivWithMultipleCSSVariables = styled.div.attrs(() => ({
  style: {
    '--primary-color': '#ff0000',
    '--spacing': 16,
    '--opacity': 0.5,
    color: 'blue',
  },
}))``;

const TestCSSVariableUsage = () => {
  return (
    <>
      <DivWithCSSVariable style={{ '--another-var': 'test' }} />
      <DivWithMultipleCSSVariables style={{ '--custom': 'value', padding: 10 }} />
    </>
  );
};

/**
 * An explicitly declared `style` type replaces the built-in CSS-variable
 * widening instead of being unioned with it. The widening is applied to the
 * render target's props, so props declared on the styled component are
 * substituted over it and win.
 */
/**
 * A declared `style` narrows the fields it names and leaves the rest of CSS
 * available. Every assertion below states the width, so none of them can pass
 * merely because a required field is missing.
 */
const OwnStyleType = styled.div<{ style?: { width: number } }>``;
<OwnStyleType style={{ width: 3 }} />;
<OwnStyleType style={{ color: 'blue', width: 3 }} />;
<OwnStyleType style={{ '--x': '1', width: 3 }} />;
// @ts-expect-error the declared type narrows width, so a string is rejected
<OwnStyleType style={{ width: '3px' }} />;

/**
 * Characterizes a known limitation rather than asserting desired behavior.
 * Under `exactOptionalPropertyTypes` the merge leaves no `undefined` arm on a
 * declared `style`, so passing it explicitly is rejected. Omitting the prop is
 * unaffected and spelling `| undefined` restores it, which is what the
 * changeset tells users to do. If this case ever stops erroring the limitation
 * is gone, and the docs saying otherwise need removing.
 */
<OwnStyleType />;
const ExplicitUndefinedStyle = styled.div<{ style?: { width: number } | undefined }>``;
<ExplicitUndefinedStyle style={undefined} />;
// @ts-expect-error a declared style without `| undefined` rejects an explicit undefined
<OwnStyleType style={undefined} />;

/** Declaring a field as `never` ablates it, without touching the others. */
const AblatedStyleField = styled.div<{ style?: { color?: never; width: number } }>``;
<AblatedStyleField style={{ opacity: 0.5, width: 3 }} />;
// @ts-expect-error color was ablated by the declaration
<AblatedStyleField style={{ color: 'blue', width: 3 }} />;

/**
 * The declared constraint survives `as` and `forwardedAs`. The polymorphic path
 * merges rather than substituting, so the render target's `style` no longer
 * replaces the component's own -- otherwise a constraint could be escaped by
 * rendering the same component through a different tag.
 */
<OwnStyleType as="a" style={{ color: 'red', width: 3 }} />;
<OwnStyleType as="a" href="/x" style={{ width: 3 }} />;
// @ts-expect-error the declared width constraint holds through `as`
<OwnStyleType as="a" style={{ width: '3px' }} />;
// @ts-expect-error ...and through `forwardedAs`
<OwnStyleType forwardedAs="a" style={{ width: '3px' }} />;

/** `CustomStyle` ablates everything the declaration does not name. */
const ExactStyleType = styled.div<{ style?: CustomStyle<{ width: number }> }>``;
<ExactStyleType style={{ width: 3 }} />;
<ExactStyleType as="a" style={{ width: 3 }} />;
// @ts-expect-error the ablation holds through `as` too
<ExactStyleType as="a" style={{ color: 'red', width: 3 }} />;
// @ts-expect-error CustomStyle accepts only the fields it was given
<ExactStyleType style={{ color: 'blue', width: 3 }} />;
// @ts-expect-error custom properties are ablated too
<ExactStyleType style={{ '--x': '1', width: 3 }} />;

/** A target that declares no `style` prop does not gain one. */
const NoStyleTarget = (props: { label: string }) => <div>{props.label}</div>;
const StyledNoStyleTarget = styled(NoStyleTarget)``;
<StyledNoStyleTarget label="x" />;
// @ts-expect-error the target declares no style prop, so neither does this one
<StyledNoStyleTarget label="x" style={{ color: 'red' }} />;

/** `style={undefined}` stays assignable under exactOptionalPropertyTypes. */
<DivWithCSSVariable style={undefined} />;

/** Widening is visible through prop extraction, not only at the call site. */
const StyleExtractionTarget = styled.div``;
const extractedStyle: React.ComponentProps<typeof StyleExtractionTarget>['style'] = {
  '--from-extraction': 'ok',
};

/**
 * Styled object with nested selectors without CSSProperties
 */
const StyledObjectWithNestedSelectors: StyledObject = {
  '&:hover': {
    '.sort-arrows': {
      '> svg': {
        color: 'red',
      },
    },
  },
};

/**
 * Nested styled component
 */

const ParentStyledComponent1 = styled.a<{ $prop1?: boolean }>``;
const ParentStyledComponent2 = styled(ParentStyledComponent1)<{ $prop2?: boolean }>``;
const ParentStyledComponent3 = styled(ParentStyledComponent2)<{ $prop3?: boolean }>``;

<ParentStyledComponent2 $prop1={true} $prop2={true} />;
<ParentStyledComponent3 $prop1={true} $prop2={true} $prop3={true} />;

<ParentStyledComponent2
  $prop1={true}
  $prop2={true}
  // @ts-expect-error Property '$prop3' does not exist on type
  $prop3={true}
/>;

/**
 * Nested class component
 */
class ParentClassComponent1 extends React.Component<{ $prop1?: boolean }> {}
const ParentClassComponent2 = styled(ParentClassComponent1)<{ $prop2?: boolean }>``;

<ParentClassComponent2 $prop1={true} $prop2={true} />;

/**
 * React.ComponentProps should be able to extract "as" and "forwardedAs" props
 * https://github.com/styled-components/styled-components/issues/4294
 */
const ComponentForPropsExtraction = styled.div``;

// These should work - extracting props from styled component
type ExtractedProps = React.ComponentProps<typeof ComponentForPropsExtraction>;
type AsType = ExtractedProps['as']; // Should be StyledTarget<'web'> | undefined, not error
type ForwardedAsType = ExtractedProps['forwardedAs']; // Should be StyledTarget<'web'> | undefined, not error

// Verify the types are correct and can be assigned
const testAs: AsType = 'div';
const testAs2: AsType = Button;
const testAs3: AsType = undefined;

const testForwardedAs: ForwardedAsType = 'span';
const testForwardedAs2: ForwardedAsType = Button;
const testForwardedAs3: ForwardedAsType = undefined;

/**
 * Wrapping a component whose own `as` prop has a non-WebTarget type (e.g.
 * Next.js `Link` with `as?: Url`) must not produce an `as`-type conflict
 * (#5734). The styled-components `as` overrides the wrapped component's `as`.
 */
// Match the shape of Next.js's `UrlObject` (required `pathname`) so the
// intersection check below has real bite.
type FakeUrl = string | { pathname: string };
interface FakeLinkProps {
  href: FakeUrl;
  as?: FakeUrl;
  children?: React.ReactNode;
}
const FakeLink: React.FC<FakeLinkProps> = () => null;
const StyledFakeLink = styled(FakeLink)`
  color: red;
`;
<StyledFakeLink href="/foo">ok</StyledFakeLink>;
<StyledFakeLink href={{ pathname: '/foo' }}>also ok</StyledFakeLink>;
// `as` here is the styled-components polymorphism prop, not the FakeLink one.
<StyledFakeLink as="section" href="/foo">
  poly
</StyledFakeLink>;
// `React.ComponentProps` extraction must surface the styled-components `as`
// shape directly, not an intersection of both. Without the fix `as` resolves
// to `FakeUrl & WebTarget`, so a plain component reference (`KnownTarget`,
// without a `pathname`) is rejected.
type ExtractedFakeLink = React.ComponentProps<typeof StyledFakeLink>;
const FakeLinkAlt: React.FC<{}> = () => null;
const _fakeLinkAsTag: ExtractedFakeLink['as'] = 'a';
const _fakeLinkAsComp: ExtractedFakeLink['as'] = FakeLinkAlt;

// Spreading props that include a wrapped-component-shaped `as` (Url-typed) must
// not fail. This mirrors the actual user scenario reported in #5734.
const fakeLinkProps: FakeLinkProps = { href: '/foo', as: { pathname: '/bar' } };
<StyledFakeLink {...fakeLinkProps}>Click</StyledFakeLink>;
// Same shape, explicit `as`.
<StyledFakeLink href="/foo" as={{ pathname: '/bar' }}>
  Click
</StyledFakeLink>;
// styled-components polymorphism still works with a component target.
<StyledFakeLink as={FakeLinkAlt} href="/foo">
  poly
</StyledFakeLink>;

// Test with a component that has custom props
const ComponentWithPropsForExtraction = styled.div<{ customProp: string }>``;
type ExtractedPropsWithCustom = React.ComponentProps<typeof ComponentWithPropsForExtraction>;
type AsTypeWithCustom = ExtractedPropsWithCustom['as'];
type ForwardedAsTypeWithCustom = ExtractedPropsWithCustom['forwardedAs'];
type CustomPropType = ExtractedPropsWithCustom['customProp']; // Should be string

/**
 * attrs should make provided props optional (#4076)
 */
const AttrsBase: React.FC<{ foo: number; bar: string }> = () => null;

// Object attrs: foo becomes optional
const AttrsOptObj = styled(AttrsBase).attrs({ foo: 42 })``;
<AttrsOptObj bar="hello" />;
<AttrsOptObj foo={99} bar="hello" />;
// @ts-expect-error bar is still required
<AttrsOptObj />;

// Function attrs: foo becomes optional
const AttrsOptFn = styled(AttrsBase).attrs(() => ({ foo: 42 }))``;
<AttrsOptFn bar="hello" />;
// @ts-expect-error bar is still required
<AttrsOptFn />;

// Chained attrs: both foo and bar become optional
const AttrsChained = styled(AttrsBase).attrs({ foo: 42 }).attrs({ bar: 'default' })``;
<AttrsChained />;
<AttrsChained foo={1} />;
<AttrsChained bar="custom" />;

// attrs-provided props keep their type (not widened to any)
const AttrsTyped = styled(AttrsBase).attrs({ foo: 42 })``;
// @ts-expect-error foo is number, not string
<AttrsTyped foo="wrong" bar="hello" />;
// @ts-expect-error bar is string, not number
<AttrsTyped bar={123} />;

// Without attrs, required props stay required
const AttrsNone = styled(AttrsBase)``;
// @ts-expect-error foo is required
<AttrsNone bar="hello" />;
// @ts-expect-error bar is required
<AttrsNone foo={42} />;

// attrs providing all required props
const AttrsAll = styled(AttrsBase).attrs({ foo: 42, bar: 'hello' })``;
<AttrsAll />;
<AttrsAll foo={1} bar="override" />;

// HTML element attrs
const AttrsButton = styled.button.attrs({ type: 'button' as const })``;
<AttrsButton />;
<AttrsButton type="submit" />;
<AttrsButton disabled />;
<AttrsButton onClick={() => {}} />;
// @ts-expect-error href doesn't exist on button
<AttrsButton href="/foo" />;

// Chained styled() with attrs across levels
const AttrsL1 = styled.div<{ a: string; b: string; c: string }>``;
const AttrsL2 = styled(AttrsL1).attrs({ a: 'default' })``;
const AttrsL3 = styled(AttrsL2).attrs({ b: 'default' })``;
<AttrsL3 c="required" />;
<AttrsL3 a="override" b="override" c="required" />;
// @ts-expect-error c is required
<AttrsL3 />;

// Object style syntax with attrs
const AttrsObjStyle = styled.div.attrs({ role: 'button' as const })({
  cursor: 'pointer',
});
<AttrsObjStyle />;
<AttrsObjStyle role="link" />;

/**
 * Override cascade: strict prop types through styled() and attrs
 * Tests that required/optional/literal types are preserved correctly
 * through wrapping, extending, and attrs at each level.
 */

// Strict literal union props
interface StrictProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}
const StrictBase: React.FC<StrictProps> = () => null;

// styled(StrictBase) should preserve all prop requirements
const StrictStyled = styled(StrictBase)``;
<StrictStyled variant="primary" size="md" />;
<StrictStyled variant="danger" size="lg" disabled />;
// @ts-expect-error variant is required
<StrictStyled size="md" />;
// @ts-expect-error size is required
<StrictStyled variant="primary" />;
// @ts-expect-error invalid variant value
<StrictStyled variant="invalid" size="md" />;
// @ts-expect-error invalid size value
<StrictStyled variant="primary" size="xl" />;

// attrs providing one strict prop: the other remains required with its literal type
const StrictWithVariant = styled(StrictBase).attrs({ variant: 'primary' as const })``;
<StrictWithVariant size="md" />;
<StrictWithVariant size="lg" disabled />;
<StrictWithVariant variant="secondary" size="md" />;
// @ts-expect-error size is still required
<StrictWithVariant />;
// @ts-expect-error size still has strict literal type
<StrictWithVariant size="xl" />;

// attrs providing all strict props
const StrictAllAttrs = styled(StrictBase).attrs({
  variant: 'primary' as const,
  size: 'md' as const,
})``;
<StrictAllAttrs />;
<StrictAllAttrs disabled />;
<StrictAllAttrs variant="danger" size="lg" />;
// @ts-expect-error variant still typed strictly when overridden
<StrictAllAttrs variant="invalid" />;

// Extension chain: strict props preserved through styled(styled())
const StrictExtended = styled(StrictStyled)<{ $extra: string }>``;
<StrictExtended variant="primary" size="md" $extra="test" />;
// @ts-expect-error variant still required on extension
<StrictExtended size="md" $extra="test" />;
// @ts-expect-error $extra is required
<StrictExtended variant="primary" size="md" />;
// @ts-expect-error invalid variant on extension
<StrictExtended variant="bad" size="md" $extra="test" />;

// Extension with attrs: strict types flow through to grandchild
const StrictExtendedWithAttrs = styled(StrictWithVariant)<{ $extra?: boolean }>``;
<StrictExtendedWithAttrs size="md" />;
<StrictExtendedWithAttrs size="sm" $extra />;
// @ts-expect-error size still has strict literal type in grandchild
<StrictExtendedWithAttrs size="xl" />;

// Numeric strict types
interface NumericProps {
  count: number;
  label: string;
}
const NumericBase: React.FC<NumericProps> = () => null;
const NumericWithAttrs = styled(NumericBase).attrs({ count: 0 })``;
<NumericWithAttrs label="test" />;
<NumericWithAttrs count={5} label="test" />;
// @ts-expect-error label is still required
<NumericWithAttrs />;
// @ts-expect-error count is number, not string
<NumericWithAttrs count="five" label="test" />;

// Boolean strict types
interface ToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}
const ToggleBase: React.FC<ToggleProps> = () => null;
const ToggleWithAttrs = styled(ToggleBase).attrs({ isOpen: false })``;
<ToggleWithAttrs onToggle={() => {}} />;
<ToggleWithAttrs isOpen={true} onToggle={() => {}} />;
// @ts-expect-error onToggle is still required
<ToggleWithAttrs />;
// @ts-expect-error isOpen is boolean, not string
<ToggleWithAttrs isOpen="yes" onToggle={() => {}} />;

/**
 * Wrapping a component whose props can't be statically introspected -- e.g.
 * Mantine v7's polymorphic-factory components, whose generic callable signature
 * makes `React.ComponentPropsWithRef` resolve to `{}` -- must stay permissive at
 * the JSX call site rather than reject every prop including `children` (#5756).
 *
 * The synthetic factory below mirrors Mantine's exact shape: a generic callable
 * intersected with `FunctionComponent` statics. Verified against real
 * `@mantine/core@7` that this collapses `ComponentPropsWithRef` to `{}`.
 */
type FactoryExtendedProps<Props = {}, OverrideProps = {}> = OverrideProps &
  Omit<Props, keyof OverrideProps>;
type FactoryElementType = keyof React.JSX.IntrinsicElements | React.JSXElementConstructor<any>;
type FactoryPropsOf<C extends FactoryElementType> = React.JSX.LibraryManagedAttributes<
  C,
  React.ComponentProps<C>
>;
type FactoryComponentProp<C> = { component?: C };
type FactoryInheritedProps<C extends FactoryElementType, Props = {}> = FactoryExtendedProps<
  FactoryPropsOf<C>,
  Props
>;
type PolymorphicFactoryProps<C, Props = {}> = C extends React.ElementType
  ? FactoryInheritedProps<C, Props & FactoryComponentProp<C>> & {
      ref?: any;
      renderRoot?: (props: any) => any;
    }
  : Props & { component: React.ElementType; renderRoot?: (props: Record<string, any>) => any };

interface PolyButtonProps {
  variant?: string;
  color?: string;
  children?: React.ReactNode;
}
type PolymorphicFactoryButton = (<C = 'button'>(
  props: PolymorphicFactoryProps<C, PolyButtonProps>
) => React.ReactElement) &
  Omit<React.FunctionComponent<PolymorphicFactoryProps<any, PolyButtonProps>>, never> & {
    extend: (p: any) => any;
  };
declare const PolyButton: PolymorphicFactoryButton;

// The premise: this resolves to `{}` (no statically-known keys).
type PolyButtonResolvedProps = React.ComponentPropsWithRef<typeof PolyButton>;
const _polyPremise: keyof PolyButtonResolvedProps extends never ? true : false = true;

const StyledPolyButton = styled(PolyButton)`
  color: red;
`;
// Arbitrary props + children accepted (permissive fallback).
<StyledPolyButton variant="filled" color="blue">
  hi
</StyledPolyButton>;
<StyledPolyButton>just children</StyledPolyButton>;
// `as` is still accepted. The fallback can't resolve the `as`-target's own props
// though: a permissive prop bag is required to accept the unknown base props, and
// that same bag types every key (including the target's) as the catch-all, so e.g.
// `href` below is not anchor-checked. This is the unavoidable cost of having no
// base type to substitute against -- an introspectable base keeps full `as` typing.
<StyledPolyButton as="a" href="/x">
  link
</StyledPolyButton>;

/**
 * Adding the component's own props must not switch the permissiveness off.
 * Whether a target can be introspected is a property of the target, so a
 * transient prop of our own does not make the target's props knowable (#5756).
 */
const StyledPolyButtonWithOwnProps = styled(PolyButton)<{ $variant: 'a' | 'b' }>`
  color: red;
`;
<StyledPolyButtonWithOwnProps $variant="a" variant="filled">
  children still accepted
</StyledPolyButtonWithOwnProps>;
// @ts-expect-error -- our own declared prop stays strictly typed
<StyledPolyButtonWithOwnProps $variant="nope" />;

/**
 * The same must hold through `.attrs()` with an explicit generic. The widening
 * is decided from the target, so adding the component's own props to the attrs
 * call does not make the target introspectable.
 */
const PolyButtonExplicitAttrs = styled(PolyButton).attrs<{ $v: string }>({ $v: 'a' })``;
<PolyButtonExplicitAttrs $v="a" color="blue">
  children still accepted
</PolyButtonExplicitAttrs>;

// `.attrs()` is permissive too for un-introspectable targets, so arbitrary keys
// can be backfilled (matching the JSX call site).
const PolyButtonWithAttrs = styled(PolyButton).attrs({ variant: 'filled', type: 'button' })``;
<PolyButtonWithAttrs color="blue">hi</PolyButtonWithAttrs>;
// Function-form attrs can read arbitrary props (typed `unknown`).
styled(PolyButton).attrs(props => ({ 'data-variant': String(props.variant ?? '') }))``;
// Introspectable targets keep strict `.attrs()` typing.
declare const TypedAttrsComp: (props: { a: string }) => React.ReactElement;
// @ts-expect-error -- `nope` is not a prop of the wrapped component
styled(TypedAttrsComp).attrs({ nope: 1 })``;

// A bare union of disjoint shapes is introspectable, even though `keyof` of the
// union is `never`. It must stay strict, not fall into the permissive branch.
type DisjointUnionProps = { a: string } | { b: string };
declare const DisjointUnionComp: (props: DisjointUnionProps) => React.ReactElement;
const StyledDisjointUnion = styled(DisjointUnionComp)`
  color: red;
`;
<StyledDisjointUnion a="x" />;
<StyledDisjointUnion b="y" />;
// @ts-expect-error -- `nonsense` is on neither union member; widening must not fire
<StyledDisjointUnion a="x" nonsense="y" />;

// All-optional props have a non-`never` `keyof`, so they stay strict (the widen
// fallback fires only when there are genuinely no known keys).
declare const AllOptionalComp: (props: { a?: string }) => React.ReactElement;
const StyledAllOptional = styled(AllOptionalComp)``;
// @ts-expect-error -- unknown prop still rejected
<StyledAllOptional nonsense="y" />;

// A union with one empty member (`{} | { a }`) is still introspectable: not every
// constituent is empty, so the distributed check must not widen it.
declare const OneEmptyMemberComp: (props: {} | { a: string }) => React.ReactElement;
const StyledOneEmpty = styled(OneEmptyMemberComp)``;
// @ts-expect-error -- nonsense is on neither member
<StyledOneEmpty nonsense="y" />;

/* ===========================================================================
 * Cases ported from reported issues.
 *
 * Sections labelled BASELINE-PIN record behavior a reporter wanted changed and
 * the maintainer ruled deliberate or blocked upstream. The pin exists so a move
 * in either direction is a visible diff, not so the reporter's wish becomes an
 * assertion.
 * =========================================================================== */

/**
 * #5687: an unannotated ref callback on a bare intrinsic tag must contextually
 * infer the element type instead of falling to an implicit `any`. The parameter
 * MUST stay unannotated -- annotating it masks the failure, the same trap the
 * `StyledCheckbox` case above warns about.
 */
const BareRefWrapper = styled.div``;
<BareRefWrapper
  ref={ref => {
    ref;
  }}
/>;

/**
 * #5756 (kkwasny-rtbh) -- BASELINE-PIN. A generic polymorphic component's props
 * collapse to `{}` under introspection, so the styled wrapper accepts a prop
 * value the direct call site rejects. #5758 documents this as unavoidable: with
 * no base type to substitute against, the prop bag must stay permissive. The
 * direct call below is the positive control -- if it ever stops erroring, its
 * unused directive fires and the pin has moved.
 */
type GenericAsProp<C extends React.ElementType> = { as?: C };
type GenericPolyProps<C extends React.ElementType, P = object> = React.PropsWithChildren<
  P & GenericAsProp<C>
> &
  Omit<React.ComponentPropsWithoutRef<C>, keyof (GenericAsProp<C> & P)>;
interface GenericPolyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}
const GenericPolyButton = <C extends React.ElementType = 'button'>(
  _props: GenericPolyProps<C, GenericPolyButtonProps>
) => null;
// @ts-expect-error the direct call site narrows `variant` and rejects this
<GenericPolyButton variant="totally-fake">x</GenericPolyButton>;
const StyledGenericPolyButton = styled(GenericPolyButton)``;
// Pinned: accepted today, because the target carries no introspectable props.
<StyledGenericPolyButton variant="totally-fake">x</StyledGenericPolyButton>;

/**
 * #5760: the destructured parameter of `styled.<tag>(fn)` must keep its declared
 * type. A plain compile proves nothing here because `any` compiles too, so the
 * directive below is the presence anchor: if `$x` silently widens to `any` the
 * assignment stops erroring and the unused directive itself fails the build.
 */
styled.div<{ $x: number }>(({ $x }) => {
  // @ts-expect-error a number is not assignable to a string; if this stops
  // erroring, `$x` has widened to `any`
  const leak: string = $x;
  return `content: "${leak}";`;
});

/**
 * #4303 (dup of #4076): `.attrs({ x: 'a' })` without `as const` must still
 * satisfy a required union-typed prop. Every other strict-literal attrs case in
 * this file uses `as const`; this is the half that does not, and the widened
 * `string` value is exactly what decides whether the attrs key set is empty.
 */
const UnionPropBase = (_props: { x: 'a' | 'b' }) => null;
const UnionAttrsWidened = styled(UnionPropBase).attrs({ x: 'a' })``;
const UnionAttrsConst = styled(UnionPropBase).attrs({ x: 'a' as const })``;
<UnionAttrsWidened />;
<UnionAttrsConst />;

/**
 * #4112 -- BASELINE-PIN. `as="button"` does not discard a required prop declared
 * by the wrapped base: `requiredProp` is not a key of the button prop bag, so
 * `Substitute` keeps it and the call still demands it. The reporter expected the
 * `as` target's props to replace the base's wholesale, which is not what
 * `Substitute` implements, and the thread never corroborated the "fixed" note.
 */
const AsRequiredBase = (_props: { className?: string; requiredProp: string }) => null;
const StyledAsRequiredBase = styled(AsRequiredBase)``;
// @ts-expect-error requiredProp survives the `as` swap and is still required
<StyledAsRequiredBase as="button">children</StyledAsRequiredBase>;

/**
 * #3582: a dashed custom-element string is an accepted `as` and `forwardedAs`
 * target, falling through to `{}` props rather than being rejected. (What was
 * reported there was a runtime CSS-application bug, not a typing one.)
 */
const CustomElementHost = styled.div``;
<CustomElementHost as="button">button tag</CustomElementHost>;
<CustomElementHost forwardedAs="x-button">forwarded custom element</CustomElementHost>;
<CustomElementHost as="x-button">custom element</CustomElementHost>;

/**
 * #4305 -- BASELINE-PIN, and sensitive to the installed `@types/react` major.
 * A styled component is not assignable to the type of the component it wraps:
 * nested mapped/conditional types do not relate structurally
 * (microsoft/TypeScript#50896). This pins the `@types/react` 18 behavior, which
 * is what this repo installs. The same code compiles on `@types/react` 19, so on
 * a bump this directive is expected to need removing rather than signalling a
 * regression.
 */
const LayerOne = styled.div``;
const LayerTwo = styled(LayerOne)``;
const takesLayerOne = (component: typeof LayerOne) => component;
// @ts-expect-error blocked on TS#50896 under @types/react 18
takesLayerOne(LayerTwo);

/**
 * #4052: event-handler parameter inference, both halves together. The extracted
 * handler type must resolve to a real handler rather than `any`, and the inline
 * form must contextually type `e` with no annotation.
 */
const EventInferenceTarget = styled.div`
  color: red;
`;
type ExtractedOnClick = React.ComponentProps<typeof EventInferenceTarget>['onClick'];
const extractedClickHandler: NonNullable<ExtractedOnClick> = e => {
  e.stopPropagation();
};
<EventInferenceTarget onClick={extractedClickHandler} />;
<EventInferenceTarget
  onClick={e => {
    e.stopPropagation();
  }}
/>;

/**
 * #4052 (winterbe): not only DOM callbacks. Any function-typed prop on a wrapped
 * component must contextually type its parameter, so `name` stays unannotated
 * and must infer to `string`.
 */
function FnPropTarget(props: { hello: (name: string) => string }) {
  return <span>{props.hello('world')}</span>;
}
const StyledFnPropTarget = styled(FnPropTarget)`
  background: pink;
`;
<StyledFnPropTarget hello={name => `Hello ${name}`} />;

/**
 * #4088: annotating the `.attrs()` callback parameter with a type the target
 * does not have is genuinely wrong and must be rejected, along with reading that
 * prop back inside an interpolation. Passing the props as the `.attrs<>()`
 * generic is the accepted form and must compile, with the prop readable.
 */
interface BorderlessProps {
  is_borderless: boolean;
}
// @ts-expect-error the div's attrs parameter type is not BorderlessProps
const WrongAnnotatedAttrs = styled.div.attrs((props: BorderlessProps) => props)`
  ${props =>
    // @ts-expect-error is_borderless is not among the div's props
    props.is_borderless === true ? '' : 'border-bottom: 1px solid red;'}
`;
const CorrectAnnotatedAttrs = styled.div.attrs<BorderlessProps>(props => props)`
  ${props => (props.is_borderless === true ? '' : 'border-bottom: 1px solid red;')}
`;
<CorrectAnnotatedAttrs is_borderless />;

/**
 * #4174 (fabb): prop extraction reached through `ReturnType<>` rather than a JSX
 * call site. Both the wrapped component's prop and the styled generic's own prop
 * must survive into `React.ComponentProps`. The mutual-extends check fails in
 * both directions, so a silent widen to `any` is caught here instead of
 * compiling quietly.
 */
const createFactoryComponent = (Comp: React.FunctionComponent<{ prop1?: string }>) =>
  styled(Comp)<{ prop2?: string }>``;
type FactoryComponentProps = React.ComponentProps<ReturnType<typeof createFactoryComponent>>;
type MutuallyExtends<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const factoryProp1IsString: MutuallyExtends<FactoryComponentProps['prop1'], string | undefined> =
  true;
const factoryProp2IsString: MutuallyExtends<FactoryComponentProps['prop2'], string | undefined> =
  true;

/**
 * #4151 -- BASELINE-PIN on the rejection half. A bare `data-*` key in `.attrs()`
 * with no generic stays rejected: auto-widening was considered and refused,
 * because the index type it needs would let any unspecified prop through
 * untyped. The JSX call site and the documented `.attrs<DataAttributes>` form
 * must still compile.
 */
const DataAttrPlain = styled.div``;
<DataAttrPlain data-testid="foo" />;
const DataAttrBare = styled.div.attrs({
  // @ts-expect-error data-* keys need the DataAttributes generic; auto-widening
  // was rejected because the index type accepts any unspecified prop untyped
  'data-testid': 'box-test',
})``;
const DataAttrGeneric = styled.div.attrs<DataAttributes>({
  'data-testid': 'box-test',
})``;
<DataAttrGeneric data-testid="foo" />;

/**
 * #4340: `.attrs({ as })` chained across two levels, plus the function form that
 * reads the incoming `as` and defaults it.
 *
 * The reporter's concrete type complaint was that the resolved target's own
 * props were not picked up, so the assertion is that `disabled` is available and
 * typed. `disabled` alone would pass vacuously against a permissive prop bag, so
 * three controls sit alongside it: the span level rejects `disabled`, the button
 * level rejects `href`, and it rejects a wrongly typed `disabled`.
 */
const DivAsSpan = styled.div.attrs({ as: 'span' })``;
const SpanAsButton = styled(DivAsSpan).attrs({ as: 'button' })``;
<DivAsSpan>I should be a span</DivAsSpan>;
<SpanAsButton>I should be a button</SpanAsButton>;
<SpanAsButton as="a">I should be a link</SpanAsButton>;
// The button target's own prop, resolved through two levels of attrs.
<SpanAsButton disabled>I should be a disabled button</SpanAsButton>;
// @ts-expect-error the span level does not have `disabled`, so the line above is
// evidence the second attrs level re-resolved the target
<DivAsSpan disabled />;
// @ts-expect-error the resolved target is a button, so `href` is not among its props
<SpanAsButton href="#" />;
// @ts-expect-error `disabled` resolves as a boolean, not as a catch-all
<SpanAsButton disabled="yes" />;
// The `as` prop still narrows at the call site, on top of the attrs-resolved target.
<SpanAsButton as="a" href="#">
  polymorphic on top of attrs
</SpanAsButton>;

/**
 * The reporter's workaround form, which he reported as breaking types. It
 * compiles. Note what it costs: `as || 'button'` types the resolved target as
 * the whole `WebTarget` union rather than the `'button'` literal, so the target
 * cannot be introspected and the prop bag falls back to the permissive shape
 * documented for un-introspectable targets (#5756). `disabled` is therefore
 * accepted here for a different reason than above -- do not read this line as
 * evidence of target resolution.
 */
const SpanAsButtonFn = styled(DivAsSpan).attrs(({ as }) => ({ as: as || 'button' }))``;
<SpanAsButtonFn disabled>permissive, not resolved</SpanAsButtonFn>;
<SpanAsButtonFn as="a" href="#">
  the function form still takes `as`
</SpanAsButtonFn>;

/**
 * #4196: a CSS custom property declared inside a nested at-rule block in object
 * styles, in both the outer and the nested scope.
 */
styled.div({
  '--color-a': 'red',
  background: 'var(--color-a)',
  '@media(min-width:760px)': {
    '--color-a': 'blue',
    background: 'var(--color-a)',
  },
});

/**
 * #4246 -- BASELINE-PIN. Wrapping a generic component loses its type parameter;
 * TypeScript cannot carry one through a higher-order wrapper. What is pinned
 * here is the separable, styled-components-side half: wrapping a still-generic
 * target must not produce a `WebTarget` constraint error, with or without a
 * trailing `satisfies`.
 */
const GenericTarget = <T,>(props: {
  className?: string;
  onOpen: (item: T) => void;
  items: T[];
}): React.JSX.Element | null => <div className={props.className} />;
const StyledGenericTargetSatisfies = styled(GenericTarget)`` satisfies typeof GenericTarget;
const StyledGenericTargetPlain = styled(GenericTarget)``;

/**
 * #4336: a styled component interpolated into a computed property key in object
 * syntax. This works because a styled component's type intersects with `string`;
 * the case exists so dropping that intersection shows up here.
 */
const ComputedKeyCard = styled.div({});
styled.div({
  [`&:hover > ${ComputedKeyCard}`]: {
    color: 'red',
  },
});

/**
 * #5531: a plain function component (not `React.FC`) whose required prop is
 * supplied by `.attrs()` must stop being required at the call site. This chain
 * substitutes a prop bag with itself, a shape no other case here produces.
 */
interface PlainFnProps {
  type: string;
  className?: string;
}
function PlainFnTarget({ type, className }: PlainFnProps) {
  return <div className={className}>{type}</div>;
}
const PlainFnWithAttrs = styled(PlainFnTarget).attrs({ type: 'element' })``;
<PlainFnWithAttrs />;

/**
 * #4138 (davidkarlsson) -- BASELINE-PIN. The reporter's form is rejected, and it
 * is rejected for two independent reasons, pinned separately below so a
 * relaxation of either is legible:
 *
 *   1. Ordering. A generic written *after* `.attrs()` is not in scope for the
 *      callback, so annotating the parameter with it asks for a prop the bag
 *      does not carry yet.
 *   2. The result key. An arbitrary key in the attrs result is rejected by
 *      object-literal checking, the same rule as the `data-*` case above.
 *
 * The last declaration is the positive control: the generic on `.attrs<>()` plus
 * a real prop as the result key compiles.
 */
type TrailingGenericProps = { $test: string };
// Both causes at once -- the reporter's own form.
const TrailingGenericAttrs = styled.div.attrs(
  // @ts-expect-error the trailing generic is not in scope for the callback param
  (p: TrailingGenericProps) => ({ 'test-attr': p.$test })
)<TrailingGenericProps>``;
// Ordering alone: a real result key does not rescue the trailing generic.
const TrailingGenericAttrsRealKey = styled.div.attrs(
  // @ts-expect-error the trailing generic is not in scope for the callback param
  (p: TrailingGenericProps) => ({ title: p.$test })
)<TrailingGenericProps>``;
// Result key alone: correct ordering, arbitrary key still rejected.
const LeadingGenericAttrsArbitraryKey = styled.div.attrs<TrailingGenericProps>(
  // @ts-expect-error `test-attr` is not a div prop
  p => ({ 'test-attr': p.$test })
)<TrailingGenericProps>``;
// Neither cause: compiles.
const LeadingGenericAttrs = styled.div.attrs<TrailingGenericProps>(p => ({
  title: p.$test,
}))<TrailingGenericProps>``;
<LeadingGenericAttrs $test="hello">test</LeadingGenericAttrs>;

/**
 * #4082: `withTheme` must keep the wrapped component's own props, `children`
 * included, with no cast at the call site.
 */
class WithThemeButton extends React.Component<{
  onClick: () => void;
  children?: React.ReactNode;
}> {}
const ThemedWithThemeButton = withTheme(WithThemeButton);
<ThemedWithThemeButton onClick={() => {}}>Test</ThemedWithThemeButton>;

/**
 * #2673: a class component's static properties must survive `styled()` and stay
 * readable off the result. The `TargetWithStaticProperties` case above covers a
 * function component with an attached property, a different declaration form.
 */
class TabsWithStatic extends React.Component<{ children?: React.ReactNode }> {
  static TabPane = (props: { tab: string }) => <div>{props.tab}</div>;

  render() {
    return <div>{this.props.children}</div>;
  }
}
const StyledTabsWithStatic = styled(TabsWithStatic)``;
const { TabPane: StyledTabPane } = StyledTabsWithStatic;
<StyledTabsWithStatic>
  <StyledTabPane tab="one" />
</StyledTabsWithStatic>;

/**
 * #4062 (lrdxg1): a `css<Props>` result returned conditionally from an
 * interpolation inside a `styled.div<Props>` must not need a cast to
 * `RuleSet<object>`. What was reported was a variance complaint about the
 * interpolation's own prop type.
 */
interface DrawerContainerProps {
  appearFrom?: 'top' | 'bottom';
  height?: 'auto' | number;
}
const drawerAutoHeight = css<DrawerContainerProps>`
  ${({ appearFrom }) =>
    appearFrom === 'bottom'
      ? css`
          transform: translate(0, 100%);
          bottom: 0;
        `
      : ''}
`;
styled.div<DrawerContainerProps>`
  position: fixed;

  ${({ height }) => height === 'auto' && drawerAutoHeight};
`;

/**
 * #4062: the v5-to-v6 type replacements named in the close --
 * `FlattenSimpleInterpolation` to `RuleSet`, `ThemeProps` to
 * `ExecutionContext & Props`, `SimpleInterpolation` to `Interpolation<object>`,
 * `StyledComponentProps` to `React.ComponentProps<typeof YourSC>`. Each is
 * declared and then used, so an accidental export deletion fails here.
 */
type V6FlattenSimpleInterpolation = RuleSet<object>;
type V6ThemeProps<P> = ExecutionContext & P;
type V6SimpleInterpolation = Interpolation<object>;
const V6StyledComponent = styled.div<{ $a?: number }>``;
type V6StyledComponentProps = React.ComponentProps<typeof V6StyledComponent>;
const v6Rules: V6FlattenSimpleInterpolation = css`
  color: red;
`;
const v6Themed: V6ThemeProps<{ label: string }> = { label: 'hi', theme: {} };
const v6Interpolation: V6SimpleInterpolation = 'red';
const v6Props: V6StyledComponentProps = { $a: 1 };

/**
 * #3359 (aaavakian) -- BASELINE-PIN. `.attrs({ forwardedAs })` does not
 * substitute the forwarded target's props: only `as` is read when the target is
 * re-resolved from the attrs result, so an `input`-only prop stays unavailable.
 * Pinned so a change that starts substituting through `forwardedAs` is visible.
 */
const ForwardedAsAttrsBase = (props: { className?: string }) => <div className={props.className} />;
const ForwardedAsAttrs = styled(ForwardedAsAttrsBase).attrs({ forwardedAs: 'input' })``;
// @ts-expect-error `value` belongs to the forwardedAs target, which is not substituted
<ForwardedAsAttrs value="text" />;

/**
 * #4112 (wojtekmaj): a hand-rolled wrapper that re-declares `as?: WebTarget`
 * does not thereby gain the `as` target's props. The styled component narrows
 * `as="a"` to anchor props; the wrapper does not, because its declared props are
 * the button's. The reporter labelled his own report a mistake, so the wrapper
 * half is pinned as a rejection rather than encoded as a bug.
 */
const AsWrapperButton = styled.button`
  background-color: yellow;
`;
type AsWrapperProps = React.ComponentPropsWithoutRef<typeof AsWrapperButton> & {
  as?: WebTarget;
};
function AsWrapper(props: AsWrapperProps) {
  return <AsWrapperButton {...props} />;
}
<AsWrapperButton type="submit">Test button</AsWrapperButton>;
<AsWrapperButton as="a" href="https://example.com">
  Test link
</AsWrapperButton>;
<AsWrapper type="submit">Test button</AsWrapper>;
// @ts-expect-error `href` is not among AsWrapper's declared props, which are the button's
<AsWrapper as="a" href="https://example.com">
  Test link
</AsWrapper>;

/**
 * #1803 / #3306 -- BASELINE-PIN. `styled()` cannot carry a component's type
 * parameter through, so the render callback's parameter degrades to `unknown`.
 * The unwrapped call directly below is the positive control: without it, a
 * failure on the wrapped one could not be told apart from this section never
 * having compiled.
 */
interface GenericListProps<T> {
  renderChild: (props: T) => React.ReactNode;
  values: T[];
}
function GenericList<T>(props: GenericListProps<T>) {
  return <>{props.values.map(props.renderChild)}</>;
}
<GenericList
  values={[{ id: 1, value: 'foo' }]}
  renderChild={props => <p key={`I_${props.id}`}>{props.value}</p>}
/>;
const StyledGenericList = styled(GenericList)`
  position: relative;
`;
<StyledGenericList
  values={[{ id: 1, value: 'foo' }]}
  // @ts-expect-error T is lost through styled(), so props degrades to unknown
  renderChild={props => <p key={`I_${props.id}`}>{props.value}</p>}
/>;
