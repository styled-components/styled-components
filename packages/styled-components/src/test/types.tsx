/**
 * This file is meant for typing-related tests that don't need to go through Jest.
 * Run via: pnpm --filter styled-components test:types
 */
import React from 'react';
import { css, CSSProp, IStyledComponent, StyledObject } from '../index';
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

// Same as above but without any attrs values — theme should still work
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
<Text as="label" ref={(e: HTMLLabelElement | null) => {}} />;
// TODO(#4305): should error (ref should narrow to HTMLLabelElement via as="label")
// but RefAttributes<any> on the polymorphic overload accepts any ref type.
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
