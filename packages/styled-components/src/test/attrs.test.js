// @flow
import React, { Component } from 'react';
import TestRenderer from 'react-test-renderer';
import ThemeProvider from '../models/ThemeProvider';
import { getRenderedCSS, resetStyled } from './utils';

// Disable isStaticRules optimisation since we're not
// testing for ComponentStyle specifics here
jest.mock('../utils/isStaticRules', () => () => false);

let styled;

describe('attrs', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn');
    styled = resetStyled();
  });

  it('work fine with an empty object', () => {
    const Comp = styled.div.attrs({})``;
    expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot();
  });

  it('work fine with a function that returns an empty object', () => {
    const Comp = styled.div.attrs(() => ({}))``;
    expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot();
  });

  it('pass a simple attr via object', () => {
    const Comp = styled.button.attrs({
      type: 'button',
    })``;
    expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot();
  });

  it('pass a simple attr via function with object return', () => {
    const Comp = styled.button.attrs(() => ({
      type: 'button',
    }))``;
    expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot();
  });

  it('pass a React component', () => {
    // $FlowFixMe
    class ReactComponent extends Component {
      render() {
        return <p>React Component</p>;
      }
    }

    const Button = ({ component: ChildComponent }) => (
      <button>
        <ChildComponent />
      </button>
    );

    const Comp = styled(Button).attrs(() => ({
      component: ReactComponent,
    }))``;

    expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot();
  });

  it('should not call a function passed to attrs as an object value', () => {
    const stub = jest.fn(() => 'div');

    const Comp = styled.button.attrs(() => ({
      foo: stub,
    }))``;

    TestRenderer.create(<Comp />);

    expect(stub).not.toHaveBeenCalled();
  });

  it('function form allows access to theme', () => {
    const Comp = styled.button.attrs(props => ({
      'data-color': props.theme.color,
    }))``;

    expect(
      TestRenderer.create(
        <ThemeProvider theme={{ color: 'red' }}>
          <Comp />
        </ThemeProvider>
      ).toJSON()
    ).toMatchInlineSnapshot(`
      <button
        className="sc-a"
        data-color="red"
      />
    `);
  });

  it('defaultProps are merged into what function attrs receives', () => {
    const Comp = styled.button.attrs(props => ({
      'data-color': props.theme.color,
    }))``;

    Comp.defaultProps = {
      theme: {
        color: 'red',
      },
    };

    expect(TestRenderer.create(<Comp />).toJSON()).toMatchInlineSnapshot(`
      <button
        className="sc-a"
        data-color="red"
      />
    `);
  });

  it('pass props to the attr function', () => {
    const Comp = styled.button.attrs(p => ({
      type: p.submit ? 'submit' : 'button',
    }))``;

    expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot();
    expect(TestRenderer.create(<Comp submit />).toJSON()).toMatchSnapshot();
  });

  it('should replace props with attrs', () => {
    const Comp = styled.button.attrs(p => ({
      type: p.submit ? 'submit' : 'button',
      tabIndex: 0,
    }))``;

    expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot();
    expect(TestRenderer.create(<Comp type="reset" />).toJSON()).toMatchSnapshot();
    expect(TestRenderer.create(<Comp type="reset" tabIndex="-1" />).toJSON()).toMatchSnapshot();
  });

  it('should merge className', () => {
    const Comp = styled.div.attrs(() => ({
      className: 'meow nya',
    }))``;

    expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot();
  });

  it('should merge className from folded attrs', () => {
    const Inner = styled.div.attrs({ className: 'foo' })``;

    const Comp = styled(Inner).attrs(() => ({
      className: 'meow nya',
    }))``;

    expect(TestRenderer.create(<Comp className="something" />).toJSON()).toMatchInlineSnapshot(`
      <div
        className="sc-a sc-b something foo meow nya"
      />
    `);
  });

  it('should merge className even if its a function', () => {
    const Comp = styled.div.attrs(p => ({
      className: `meow ${p.purr ? 'purr' : 'nya'}`,
    }))``;

    expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot();
    expect(TestRenderer.create(<Comp purr />).toJSON()).toMatchSnapshot();
  });

  it('should merge style', () => {
    const Comp = styled.div.attrs(() => ({
      style: { color: 'red', background: 'blue' },
    }))``;

    expect(TestRenderer.create(<Comp style={{ color: 'green', borderStyle: 'dotted' }} />).toJSON())
      .toMatchInlineSnapshot(`
      <div
        className="sc-a"
        style={
          Object {
            "background": "blue",
            "borderStyle": "dotted",
            "color": "red",
          }
        }
      />
    `);
  });

  it('should work with data and aria attributes', () => {
    const Comp = styled.div.attrs(() => ({
      'data-foo': 'bar',
      'aria-label': 'A simple FooBar',
    }))``;
    expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot();
  });

  it('merge attrs', () => {
    const Comp = styled.button
      .attrs(() => ({
        type: 'button',
        tabIndex: 0,
      }))
      .attrs(() => ({
        type: 'submit',
      }))``;
    expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot();
  });

  it('merge attrs when inheriting SC', () => {
    const Parent = styled.button.attrs(() => ({
      type: 'button',
      tabIndex: 0,
    }))``;
    const Child = styled(Parent).attrs(() => ({
      type: 'submit',
    }))``;
    expect(TestRenderer.create(<Child />).toJSON()).toMatchSnapshot();
  });

  it('pass attrs to style block', () => {
    /* Would be a React Router Link in real life */
    const Comp = styled.a.attrs(() => ({
      href: '#',
      'data-active-class-name': '--is-active',
    }))`
      color: blue;
      &.${props => props['data-active-class-name']} {
        color: red;
      }
    `;
    expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot();
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        color: blue;
      }
      .b.--is-active {
        color: red;
      }"
    `);
  });

  it('should pass through children as a normal prop', () => {
    const Comp = styled.div.attrs(() => ({
      children: 'Probably a bad idea',
    }))``;
    expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot();
  });

  it('should pass through complex children as well', () => {
    const Comp = styled.div.attrs(() => ({
      children: <span>Probably a bad idea</span>,
    }))``;
    expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot();
  });

  it('should override children of course', () => {
    const Comp = styled.div.attrs(() => ({
      children: <span>Amazing</span>,
    }))``;
    expect(TestRenderer.create(<Comp>Something else</Comp>).toJSON()).toMatchSnapshot();
  });

  it('should shallow merge "style" prop + attr instead of overwriting', () => {
    const Paragraph = styled.p.attrs(p => ({
      style: {
        ...p.style,
        fontSize: `${p.fontScale}em`,
      },
    }))`
      background: red;
    `;

    class Text extends React.Component {
      state = {
        // Assume that will be changed automatically
        // according to the dimensions of the container
        fontScale: 4,
      };

      render() {
        return (
          <Paragraph
            className={this.props.className}
            style={this.props.style}
            fontScale={this.state.fontScale}
          >
            {this.props.children}
          </Paragraph>
        );
      }
    }

    const BlueText = styled(Text).attrs(() => ({
      style: {
        color: 'blue',
      },
    }))`
      background: blue;
    `;

    const rendered = TestRenderer.create(<BlueText>Hello</BlueText>);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".d {
        background: red;
      }
      .c {
        background: blue;
      }"
    `);
    expect(rendered.toJSON()).toMatchInlineSnapshot(`
            <p
              className="sc-a d sc-b c"
              style={
                Object {
                  "color": "blue",
                  "fontSize": "4em",
                }
              }
            >
              Hello
            </p>
        `);
  });

  it('does not pass non html tags to HTML element', () => {
    const Comp = styled.div`
      color: ${props => props.textColor};
    `;

    const StyledComp = styled(Comp).attrs(() => ({
      textColor: 'red',
    }))``;
    expect(TestRenderer.create(<StyledComp />).toJSON()).toMatchSnapshot();
  });
});
