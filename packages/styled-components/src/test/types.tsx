/**
 * This file is meant for typing-related tests that don't need to go through Jest.
 */
import React from 'react';
import { css, CSSProp } from '../index';
import styled from '../index-standalone';

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
      <Button as={'video'} foo loop>
        test
      </Button>
    </Wrapper>
  );
};

const Component3 = () => {
  return (
    // Wrapper should not be influenced by Button's types
    <Wrapper>
      <Button mix={['video' as const]} foo loop>
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
