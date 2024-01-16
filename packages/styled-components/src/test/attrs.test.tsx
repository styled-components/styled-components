import * as CSS from 'csstype';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import ThemeProvider from '../models/ThemeProvider';
import { AnyComponent, DataAttributes } from '../types';
import { getRenderedCSS, resetStyled } from './utils';

// Disable isStaticRules optimisation since we're not
// testing for ComponentStyle specifics here
jest.mock('../utils/isStaticRules', () => () => false);

let styled: ReturnType<typeof resetStyled>;

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
    class ReactComponent extends React.Component {
      render() {
        return <p>React Component</p>;
      }
    }

    type ButtonProps = {
      component: AnyComponent;
    };

    const Button = ({ component: ChildComponent }: ButtonProps) => (
      <button>
        <ChildComponent />
      </button>
    );

    const Comp = styled(Button).attrs<Partial<ButtonProps>>(() => ({
      component: ReactComponent,
    }))``;

    expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot();
  });

  it('should not call a function passed to attrs as an object value', () => {
    const stub = jest.fn(() => 'div');

    const Comp = styled.button.attrs<{ foo?: typeof stub }>(() => ({
      foo: stub,
    }))``;

    TestRenderer.create(<Comp />);

    expect(stub).not.toHaveBeenCalled();
  });

  it('function form allows access to theme', () => {
    const Comp = styled.button.attrs<DataAttributes>(props => ({
      'data-color': props.theme!.color,
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
    const Comp = styled.button.attrs<DataAttributes>(props => ({
      'data-color': props.theme!.color,
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
    const Comp = styled.button.attrs<{ $submit?: boolean }>(p => ({
      type: p.$submit ? 'submit' : 'button',
    }))``;

    expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot();
    expect(TestRenderer.create(<Comp $submit />).toJSON()).toMatchSnapshot();
  });

  it('should replace props with attrs', () => {
    const Comp = styled.button.attrs<{ $submit?: boolean }>(p => ({
      type: p.$submit ? 'submit' : 'button',
      tabIndex: 0,
    }))``;

    expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot();
    expect(TestRenderer.create(<Comp type="reset" />).toJSON()).toMatchSnapshot();
    expect(TestRenderer.create(<Comp type="reset" tabIndex={-1} />).toJSON()).toMatchSnapshot();
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
        className="sc-a sc-b foo meow nya something"
      />
    `);
  });

  it('should merge className even if its a function', () => {
    const Comp = styled.div.attrs<{ $purr?: boolean }>(p => ({
      className: `meow ${p.$purr ? 'purr' : 'nya'}`,
    }))``;

    expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot();
    expect(TestRenderer.create(<Comp $purr />).toJSON()).toMatchSnapshot();
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
          {
            "background": "blue",
            "borderStyle": "dotted",
            "color": "red",
          }
        }
      />
    `);
  });

  it('should work with data and aria attributes', () => {
    const Comp = styled.div.attrs<DataAttributes>(() => ({
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
    const Comp = styled.a.attrs<DataAttributes>(() => ({
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
    const Paragraph = styled.p.attrs<{ $fontScale?: number }>(p => ({
      style: {
        ...p.style,
        fontSize: `${p.$fontScale}em`,
      },
    }))<{ $fontScale: number }>`
      background: red;
    `;

    class Text extends React.Component<
      Partial<React.ComponentProps<typeof Paragraph>>,
      { fontScale: number }
    > {
      state = {
        // Assume that will be changed automatically
        // according to the dimensions of the container
        fontScale: 4,
      };

      render() {
        return (
          <Paragraph $fontScale={this.state.fontScale} {...this.props}>
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
          {
            "color": "blue",
            "fontSize": "4em",
          }
        }
      >
        Hello
      </p>
    `);
  });

  it('does not pass transient props to HTML element', () => {
    type CompProps = { $textColor: CSS.Properties['color'] };

    const Comp = styled.div<CompProps>`
      color: ${props => props.$textColor};
    `;

    const StyledComp = styled(Comp).attrs<Partial<CompProps>>(() => ({
      $textColor: 'red',
    }))``;

    expect(TestRenderer.create(<StyledComp />).toJSON()).toMatchSnapshot();
  });

  it('should apply given "as" prop to the progressive type', () => {
    const Comp = styled.div.attrs({ as: 'video' as const })``;

    expect(TestRenderer.create(<Comp loop />).toJSON()).toMatchSnapshot();
  });

  it('aliasing an alternate theme via attrs makes it through to the child component', () => {
    const InnerComp: React.FC<{ theme: object }> = p => <div {...p} />;

    const Comp = styled(InnerComp).attrs<{ alternateTheme: object | undefined }>(p => ({
      alternateTheme: undefined,
      theme: p.alternateTheme!,
    }))``;

    expect(
      TestRenderer.create(<Comp alternateTheme={{ foo: 'bar' }} />).toJSON()
    ).toMatchSnapshot();
  });
});
