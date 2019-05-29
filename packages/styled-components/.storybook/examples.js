import { storiesOf } from '@storybook/react';
import React from 'react';
import styled, { createGlobalStyle, css, keyframes, ThemeProvider, withTheme } from '../';

const SimpleStyle = () => {
  const Element = styled.div`
    color: white;
    padding: 1em;
    background-color: mediumseagreen;
  `;

  return {
    title: 'styled.x',
    Component: () => <Element>Show basic styling</Element>,
  };
};

const StaticInterpolation = () => {
  const color = { text: 'white', bg: 'background' };
  const Element = styled.div`
    color: ${color.text};
    ${color.bg}: mediumseagreen; // This breaks syntax highlighting
    padding: 1em;
  `;

  return {
    title: 'Static Interpolation',
    Component: () => <Element>Interpolate a property</Element>,
  };
};

const PropsStyle = () => {
  const Element = styled.div`
    background: ${props => (props.primary ? 'mediumseagreen' : 'papayawhip')};
    color: ${props => (props.primary ? 'white' : 'palevioletred')};
    padding: 1em;
  `;

  return {
    title: 'Function Interpolation with Props',
    Component: () => (
      <div>
        <Element>Normal</Element>
        <Element primary>Primary</Element>
      </div>
    ),
  };
};

const ComponentInterpolation = () => {
  const Wrapper = styled.div`
    display: flex;
    align-items: center;
    padding: 1em;
    background: papayawhip;
  `;

  const Box = styled.div`
    width: 50%;
    height: 64px;
    margin-right: 0.5em;
    ${Wrapper} & {
      background: mediumseagreen;
    }
  `;

  return {
    title: 'Component Interpolation',
    Component: () => (
      <Wrapper href="#">
        <Box />
        <div>&lt;- Green Box</div>
      </Wrapper>
    ),
  };
};

const ExtendedStyle = () => {
  const Element = styled.div`
    background: papayawhip;
    padding: 1em;
  `;

  const TomatoElement = styled(Element)`
    background: mediumseagreen;
    color: white;
  `;

  return {
    title: 'Extend Style',
    Component: () => (
      <div>
        <Element>Normal</Element>
        <TomatoElement>Extended</TomatoElement>
      </div>
    ),
  };
};

const PolymorphicStyle = () => {
  const Button = styled.button`
    font-size: 1em;
    margin-bottom: 0.5em;
    padding: 0.5em 1em;
    border: 2px solid palevioletred;
    border-radius: 3px;
    text-align: center;
  `;

  const GreenButton = styled(Button)`
    border-color: mediumseagreen;
    background: mediumseagreen;
    color: white;
  `;

  return {
    title: '"as" Polymorphic Prop',
    Component: () => (
      <div>
        <Button as="a" href="/">
          Button as link
        </Button>
        <GreenButton as="a" href="/">
          GreenButton as link
        </GreenButton>
      </div>
    ),
  };
};

const CustomComponentStyle = () => {
  const Link = ({ className, children }) => (
    <a className={className} href="/">
      {children}
    </a>
  );

  const StyledLink = styled(Link)`
    background: mediumseagreen;
    color: white;
    padding: 1em;
  `;

  return {
    title: 'Styling Custom Components',
    Component: () => (
      <div>
        <Link>Unstyled, boring Link</Link>
        <StyledLink>Styled, exciting Link</StyledLink>
      </div>
    ),
  };
};

const PassingHTMLProps = () => {
  const Input = styled.input`
    color: ${props => props.inputColor || 'palevioletred'};
    background: ${props => (props.inputColor === 'white' ? 'mediumseagreen' : 'papayawhip')};
    padding: 0.5em 1em;
    border: none;
    border-radius: 3px;
    font-size: 1em;
    &:last-child {
      margin-top: 1em;
    }
  `;

  return {
    title: 'Passing HTML Props',
    Component: () => (
      <div>
        <Input defaultValue="@probablyup" type="text" />
        <Input defaultValue="@geelen" type="text" inputColor="white" />
      </div>
    ),
  };
};

const PseudoSelectorStyle = () => {
  const Element = styled.button`
    ::before {
      content: '🚀 ';
    }
    :last-child {
      background-color: mediumseagreen;
      font-size: 1em;
      color: white;
    }
  `;

  return {
    title: 'Pseudo-selector Styling',
    Component: () => <Element>Hello World!</Element>,
  };
};

const NestedStyle = () => {
  const Element = styled.div`
    padding: 0.5em 1em;
    & ~ & {
      /* <Element> sibling, not adjacent */
      background: tomato;
    }
    & + & {
      /* <Element> next to <Element> */
      background: mediumseagreen;
    }
    .other {
      /* child with ".something" */
      background: orange;
    }
    &.something {
      /* <Element> with ".other" */
      background: papayawhip;
    }
    .nested & {
      /* <Element> inside ".nested" */
      border: 1px solid;
    }
  `;

  return {
    title: 'Nesting Styles and Selectors',
    Component: () => (
      <div>
        <Element>Hello world!</Element>
        <Element>How ya doing?</Element>
        <Element className="something">The sun is shining...</Element>
        <div>Pretty nice day today.</div>
        <Element>Don't you think?</Element>
        <div className="nested">
          <Element>Splendid.</Element>
        </div>
        <Element>
          <div className="other">Mystery button</div>
        </Element>
      </div>
    ),
  };
};

const GlobalStyle = () => {
  const GlobalStyle = createGlobalStyle`
    span {
      background: mediumseagreen;
      color: white;
      padding: 1em;
    }
  `;

  return {
    title: 'Global Style',
    Component: () => (
      <div>
        <GlobalStyle />
        <span>createGlobalStyle makes this green</span>
      </div>
    ),
  };
};

const AttrsStyle = () => {
  const Input = styled.input.attrs(({ bg }) => ({
    type: 'password',
    background: bg || 'white',
  }))`
    font-size: 1em;
    border: 2px solid;
    border-radius: 3px;
    padding: 0.5em;
    background: ${props => (props.bg ? 'mediumseagreen' : 'white')};
    border-color: ${props => (props.bg ? 'mediumseagreen' : 'palevioletred')};
    ::placeholder {
      color: ${props => (props.bg ? 'white' : 'palevioletred')};
    }
    &:last-child {
      margin-top: 1em;
    }
  `;

  return {
    title: 'style.x.attrs',
    Component: () => (
      <React.Fragment>
        <Input placeholder="Normal Input" />
        <Input placeholder="Green Input" bg="green" />
      </React.Fragment>
    ),
  };
};

const KeyframeStyle = () => {
  const color = keyframes`
    from {
      background: mediumseagreen;
    }
    to {
      background: mediumseagreen;
    }
  `;

  const Color = styled.div`
    animation: ${color} 2s linear infinite;
    color: white;
    padding: 1em;
  `;

  return {
    title: 'Keyframes Animation',
    Component: () => <Color>Keyframe locked green background</Color>,
  };
};

const ThemeStyle = () => {
  const Element = styled.div`
    padding: 1em;
    background: ${props => props.theme.main};
    color: ${props => (props.theme.main === 'mediumseagreen' ? 'white' : '')};
  `;
  Element.defaultProps = { theme: { main: 'papayawhip' } };
  const theme = { main: 'mediumseagreen' };

  return {
    title: 'Theme Provider Styling',
    Component: () => (
      <div>
        <Element>Normal</Element>
        <ThemeProvider theme={theme}>
          <Element>Themed</Element>
        </ThemeProvider>
      </div>
    ),
  };
};

const WithThemeStyle = () => {
  const Element = styled.div`
    padding: 1em;
    background: ${props => props.theme.main};
    color: white;
  `;
  Element.defaultProps = { theme: { main: 'palevioletred' } };

  const MyComponent = props => (
    <Element>
      Theme:
      {props.theme.main}
    </Element>
  );
  const MyComponentWithTheme = withTheme(MyComponent);

  return {
    title: 'Using withTheme HOC',
    Component: () => (
      <ThemeProvider theme={{ main: 'mediumseagreen' }}>
        <MyComponentWithTheme />
      </ThemeProvider>
    ),
  };
};

const CSSHelperStyle = () => {
  const complexMixin = css`
    background: ${props => (props.whiteColor ? 'white' : 'mediumseagreen')};
  `;

  const Element = styled.div`
    ${props => (props.complex ? complexMixin : 'color: red;')};
    color: white;
    padding: 1em;
  `;

  return {
    title: 'CSS Helper',
    Component: () => <Element complex>Complex mixin</Element>,
  };
};

const MediaQueryStyle = () => {
  const Element = styled.div`
    background: palevioletred;
    color: white;
    padding: 1em;

    @media (max-width: 100000px) {
      background: mediumseagreen;
    }
  `;

  return {
    title: 'Media Queries',
    Component: () => <Element>Background: mediumseagreen</Element>,
  };
};

let stories = storiesOf('styled-components', module);

[
  SimpleStyle(),
  StaticInterpolation(),
  PropsStyle(),
  ComponentInterpolation(),
  ExtendedStyle(),
  PolymorphicStyle(),
  CustomComponentStyle(),
  PassingHTMLProps(),
  PseudoSelectorStyle(),
  NestedStyle(),
  GlobalStyle(),
  AttrsStyle(),
  KeyframeStyle(),
  ThemeStyle(),
  WithThemeStyle(),
  CSSHelperStyle(),
  MediaQueryStyle(),
].forEach(({ title, Component }) => {
  stories = stories.add(title, Component);
});
