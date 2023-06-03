/**
 * This file is meant for typing-related tests that don't need to go through Jest.
 */
import React from 'react';
import { css, CSSProp, IStyledComponent, StyledObject } from '../index';
import styled from '../index-standalone';
import { VeryLargeUnionType } from './veryLargeUnionType';

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
  margin-top: ${props => props.theme.spacing};
`;

const Example2 = styled.div.attrs({
  // title: "test" // This works for some reason
})`
  margin-top: ${props => props.theme.spacing};
`;

/**
 * `css` prop
 */
declare module 'react' {
  interface Attributes {
    css?: CSSProp;
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
const DivWithProps = styled.div<{ waz: number }>`
  ${StyledComponent} {
    display: block;
  }

  color: ${props => props.waz};
`;
<DivWithProps waz={42} />;
<DivWithProps waz={42}>children allowed</DivWithProps>;
// @ts-expect-error DivWithProps should not have inherited foo
<DivWithProps foo={42} waz={42} />;
// @ts-expect-error DivWithProps requires waz
<DivWithProps />;

const StyledCompTest: IStyledComponent<'web', 'label', {}> = {} as any;
/* @ts-expect-error waz not defined */
<StyledCompTest waz="should error" onCopy={(e: React.ClipboardEvent<HTMLLabelElement>) => {}} />;
<StyledCompTest as="input" onCopy={(e: React.ClipboardEvent<HTMLInputElement>) => {}} />;
<StyledCompTest forwardedAs="input" onCopy={(e: React.ClipboardEvent<HTMLInputElement>) => {}} />;
<StyledCompTest forwardedAs="a" href="#" />;
<StyledCompTest css={['padding: 0px']} />;
<StyledCompTest css="padding: 0px" />;
<StyledCompTest onCopy={(e: React.ClipboardEvent<HTMLLabelElement>) => {}} />;
<StyledCompTest onCopy={e => e.currentTarget} />;

// Inherited component of styled component should inherit props too
const InheritedDivWithProps = styled(DivWithProps)<{ bar: 'bar' }>`
  color: ${props => props.waz};
  color: ${props => props.bar};

  color: ${props =>
    /* @ts-expect-error foo is not a valid prop */
    props.foo};
`;
<InheritedDivWithProps waz={42} bar="bar">
  test
</InheritedDivWithProps>;
// @ts-expect-error InheritedDiv inherited the required waz prop
<InheritedDivWithProps />;
// @ts-expect-error bar must be "bar"
<InheritedDivWithProps waz={42} bar="foo" />;

const DivWithRequiredProps = styled.div<{ foo: number; bar: string }>``;

const RequiredPropsProvidedAsAttrs = styled(DivWithRequiredProps).attrs({
  foo: 42, // Providing required prop foo, which makes it optional going forward
})``;

// foo prop is now optional
<RequiredPropsProvidedAsAttrs bar="bar" />;
// Can still provide foo if we want
<RequiredPropsProvidedAsAttrs foo={22} bar="bar" />;
// @ts-expect-error bar is still required
<RequiredPropsProvidedAsAttrs />;

/** StyledObject should accept undefined properties
 * https://github.com/styled-components/styled-components/issues/3800#issuecomment-1548941843
 */
interface MyStyle extends StyledObject<{}> {
  fontSize: string;
  lineHeight: string;
  textTransform?: string;
}

/** Attrs should not expect all props to be provided (even if they are required)
 * https://github.com/styled-components/styled-components/issues/3800#issuecomment-1548941843
 */
const AttrRequiredTest = styled(DivWithRequiredProps).attrs({
  // Should not have to provide foo within attrs
  bar: 'hello',
  // Should allow hyphenated props
  'data-test': 42,
})``;
<AttrRequiredTest foo={42} bar="bar" />;
// Bar was defaulted in attrs
<AttrRequiredTest foo={42} />;
// @ts-expect-error foo and bar are required props
<AttrRequiredTest bar="bar" />;
// @ts-expect-error foo and bar are required props
<AttrRequiredTest />;

const AttrRequiredTest2 = styled(DivWithRequiredProps).attrs({
  // @ts-expect-error foo must be a number
  foo: 'not a number',
})``;

const AttrRequiredTest2b = styled(StyledComponent).attrs({
  // @ts-expect-error foo must be a number
  foo: 'not a number',
})``;

const AttrRequiredTest3 = styled(DivWithRequiredProps).attrs<{ newProp: number }>({
  // Should allow props defined
  newProp: 42,
})``;
<AttrRequiredTest3 foo={42} bar="bar" newProp={42} />;

const AttrRequiredTest4 = styled(DivWithRequiredProps).attrs({
  // // @ts-expect-error cannot provide unknown props
  waz: 42,
})``;

/** Intrinsic props and ref are being incorrectly types when using `as`
 * https://github.com/styled-components/styled-components/issues/3800#issuecomment-1548941843
 */
const Text = styled.p``;
// @ts-expect-error Can't treat paragraph element as label element
<Text onCopy={(e: React.ClipboardEvent<HTMLLabelElement>) => {}} />;
<Text onChange={ev => ev.target} />;
<Text
  as="label"
  ref={(el: HTMLLabelElement | null) => {}}
  onCopy={(e: React.ClipboardEvent<HTMLLabelElement>) => {}}
/>;
<Text as="label" ref={(e: HTMLLabelElement | null) => {}} />;
// @ts-expect-error Should now be a label element
<Text as="label" ref={(e: HTMLParagraphElement | null) => {}} />;

const AttrObjectAsLabel = styled(Text).attrs({ as: 'label' })``;
<AttrObjectAsLabel
  ref={(el: HTMLLabelElement | null) => {}}
  onCopy={(e: React.ClipboardEvent<HTMLLabelElement>) => {}}
/>;
// @ts-expect-error Can't provide unknown props
<AttrObjectAsLabel waz={42} />;

const AttrFunctionAsLabel = styled(Text).attrs(props => ({ as: 'label' }))``;
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
}) as IStyledComponent<'web', 'div'>;

const StyledCustomComponent = styled(CustomComponent)``;

<StyledCustomComponent className="class" />;

const CustomComponentWithRequiredProps: React.FC<{
  foo: 'red' | 'black';
  bar?: boolean;
  hello: (a: string) => string;
}> = ({ foo, hello, bar }) => (
  <StyledDiv
    style={{ backgroundColor: foo, color: bar ? 'blue' : 'green' }}
    onClick={() => hello('world')}
  />
);

const StyledCustomComponentWithRequiredProps = styled(CustomComponentWithRequiredProps)``;

// foo should be typed 'red' | 'black'
// hello should be typed (a: string) => string
// bar should be optional
<StyledCustomComponentWithRequiredProps foo="red" hello={world => world} />;

// @ts-expect-error all props have type mismatches
<StyledCustomComponentWithRequiredProps foo="blue" bar="baz" hello={() => false} />;

// foo should be typed 'red' | 'black'
// hello should be typed (a: string) => string
// bar should be typed boolean
styled(CustomComponentWithRequiredProps).attrs({
  foo: 'black',
  hello: world => world,
  bar: true,
});

styled(CustomComponentWithRequiredProps).attrs(props => ({
  foo: props.foo === 'black' ? 'red' : 'black',
  hello: world => props.hello(world),
  bar: !props.bar,
}));
styled(CustomComponentWithRequiredProps).attrs(p => ({ foo: 'red' }));
styled(CustomComponentWithRequiredProps).attrs(p => ({ hello: w => 'test' }));
styled(CustomComponentWithRequiredProps).attrs(p => ({ bar: true }));
styled(CustomComponentWithRequiredProps).attrs<{ newProp: number }>(p => ({
  foo: 'red',
  newProp: 42,
}));
styled(CustomComponentWithRequiredProps).attrs<{ newProp: number }>(p => ({ hello: w => 'test' }));
styled(CustomComponentWithRequiredProps).attrs<{ newProp: number }>(p => ({ bar: true }));

// @ts-expect-error 'blue' is not assignable to 'red' or 'black'
styled(CustomComponentWithRequiredProps).attrs({ foo: 'blue' });
// @ts-expect-error argument of type number is not assignable to string
styled(CustomComponentWithRequiredProps).attrs({ hello: w => 42 });
// @ts-expect-error argument of type string is not assignable to boolean
styled(CustomComponentWithRequiredProps).attrs({ bar: 'fizz' });

// @ts-expect-error 'blue' is not assignable to 'red' or 'black'
styled(CustomComponentWithRequiredProps).attrs(p => ({ foo: 'blue' }));

// @ts-expect-error argument of type number is not assignable to string
styled(CustomComponentWithRequiredProps).attrs(p => ({ hello: w => 42 }));

// @ts-expect-error argument of type string is not assignable to boolean
styled(CustomComponentWithRequiredProps).attrs(p => ({ bar: 'fizz' }));

// Performance test
interface VeryLargeUnionProps {
  foo: VeryLargeUnionType; // Comment out this line to compare performance
}

const UnstyledComponentVeryLargeUnion = (_props: VeryLargeUnionProps) => {
  return <></>;
};

const StyledComponentVeryLargeUnion = styled(UnstyledComponentVeryLargeUnion)`
  // Multiple template strings helps illustrate possible perf issue
  color: ${props => props.theme.waz};
  color: ${props => props.theme.waz};
  color: ${props => props.theme.waz};
  color: ${props => props.theme.waz};
  color: ${props => props.theme.waz};
  color: ${props => props.theme.waz};
  color: ${props => props.theme.waz};
  color: ${props => props.theme.waz};
  color: ${props => props.theme.waz};
  color: ${props => props.theme.waz};
`;

const AttrFunctionRequiredTest1 = styled(DivWithRequiredProps).attrs(props => ({
  // Should not have to provide foo within attrs
  bar: 'hello',
  // Should allow hyphenated props
  'data-foo': 42,
}))``;

// bar was provided in attrs, so is now optional
<AttrFunctionRequiredTest1 foo={42} />;
// @ts-expect-error foo is still required though
<AttrFunctionRequiredTest1 />;

// Can provide div props into attrs
const AttrFunctionRequiredTest2 = styled.div.attrs(props => ({
  color: '',
  // Should allow custom props
  'data-foo': 42,
}))``;

// Can provide purely custom props
const AttrFunctionRequiredTest3 = styled.div.attrs(props => ({
  'data-waz': 42,
}))``;

const AttrFunctionRequiredTest4 = styled.div.attrs(props => ({
  // Can provide unknown props
  'data-waz': 42,
  waz: 42,
}))``;

const AttrFunctionRequiredTest5 = styled(DivWithRequiredProps).attrs(props => ({
  foo: props.foo ? Math.round(props.foo) : 42,
}))``;

const AttrFunctionRequiredTest6 = styled.button.attrs<{ $submit?: boolean }>(p => ({
  type: p.$submit ? 'submit' : 'button',
}))``;
<AttrFunctionRequiredTest6 $submit />;

// Can provide foo
<AttrFunctionRequiredTest1 foo={42} />;
// @ts-expect-error foo is still required though
<AttrFunctionRequiredTest1 />;

const style = css<{ prop?: boolean }>``;

const Box = styled.div<{ prop?: boolean }>`
  ${style}
`;

const Usage = () => <Box prop>something</Box>;

const NameField = styled.input``;
const r = (
  <NameField
    defaultValue="test"
    onChange={ev => {
      // <-- ev is typed as any
      console.log(ev.target);
    }}
  />
);

interface TextProps {
  $textVariant: string;
}

styled.label.attrs<TextProps>(({ $textVariant = 'footnote' }) => ({ $textVariant }));

// CSSProp support for different things
type CSSPropTestType = { color?: string; css?: CSSProp };
styled.div<CSSPropTestType>(p => ({ css: 'color: red;' }));
styled.div<CSSPropTestType>(p => ({ css: { color: 'red' } }));
styled.div<CSSPropTestType>(p => ({ css: () => ({ color: 'red' }) }));
styled.div<CSSPropTestType>(p => ({
  css: css`
    color: red;
  `,
}));
styled.div<CSSPropTestType>(p => ({
  css: css<Omit<CSSPropTestType, 'css'>>`
    color: ${p => p.color || 'red'};
  `,
}));
