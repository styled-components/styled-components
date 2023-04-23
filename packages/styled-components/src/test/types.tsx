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
