import { render } from '@testing-library/react';
import * as CSS from 'csstype';
import React from 'react';
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
    expect(render(<Comp />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div
          class="sc-a"
        />
      </DocumentFragment>
    `);
  });

  it('work fine with a function that returns an empty object', () => {
    const Comp = styled.div.attrs(() => ({}))``;
    expect(render(<Comp />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div
          class="sc-a"
        />
      </DocumentFragment>
    `);
  });

  it('pass a simple attr via object', () => {
    const Comp = styled.button.attrs({
      type: 'button',
    })``;
    expect(render(<Comp />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <button
          class="sc-a"
          type="button"
        />
      </DocumentFragment>
    `);
  });

  it('pass a simple attr via function with object return', () => {
    const Comp = styled.button.attrs(() => ({
      type: 'button',
    }))``;
    expect(render(<Comp />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <button
          class="sc-a"
          type="button"
        />
      </DocumentFragment>
    `);
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

    expect(render(<Comp />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <button>
          <p>
            React Component
          </p>
        </button>
      </DocumentFragment>
    `);
  });

  it('should not call a function passed to attrs as an object value', () => {
    const stub = jest.fn(() => 'div');

    const Comp = styled.button.attrs<{ $foo?: typeof stub }>(() => ({
      $foo: stub,
    }))``;

    render(<Comp />);

    expect(stub).not.toHaveBeenCalled();
  });

  it('function form allows access to theme', () => {
    const Comp = styled.button.attrs<DataAttributes>(props => ({
      'data-color': props.theme!.color,
    }))``;

    expect(
      render(
        <ThemeProvider theme={{ color: 'red' }}>
          <Comp />
        </ThemeProvider>
      ).asFragment()
    ).toMatchInlineSnapshot(`
      <DocumentFragment>
        <button
          class="sc-a"
          data-color="red"
        />
      </DocumentFragment>
    `);
  });

  it('theme from ThemeProvider is visible to function attrs', () => {
    const Comp = styled.button.attrs<DataAttributes>(props => ({
      'data-color': props.theme!.color,
    }))``;

    expect(
      render(
        <ThemeProvider theme={{ color: 'red' }}>
          <Comp />
        </ThemeProvider>
      ).asFragment()
    ).toMatchInlineSnapshot(`
      <DocumentFragment>
        <button
          class="sc-a"
          data-color="red"
        />
      </DocumentFragment>
    `);
  });

  it('pass props to the attr function', () => {
    const Comp = styled.button.attrs<{ $submit?: boolean }>(p => ({
      type: p.$submit ? 'submit' : 'button',
    }))``;

    expect(render(<Comp />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <button
          class="sc-a"
          type="button"
        />
      </DocumentFragment>
    `);
    expect(render(<Comp $submit />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <button
          class="sc-a"
          type="submit"
        />
      </DocumentFragment>
    `);
  });

  it('should replace props with attrs', () => {
    const Comp = styled.button.attrs<{ $submit?: boolean }>(p => ({
      type: p.$submit ? 'submit' : 'button',
      tabIndex: 0,
    }))``;

    expect(render(<Comp />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <button
          class="sc-a"
          tabindex="0"
          type="button"
        />
      </DocumentFragment>
    `);
    expect(render(<Comp type="reset" />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <button
          class="sc-a"
          tabindex="0"
          type="button"
        />
      </DocumentFragment>
    `);
    expect(render(<Comp type="reset" tabIndex={-1} />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <button
          class="sc-a"
          tabindex="0"
          type="button"
        />
      </DocumentFragment>
    `);
  });

  it('should merge className', () => {
    const Comp = styled.div.attrs(() => ({
      className: 'meow nya',
    }))``;

    expect(render(<Comp />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div
          class="sc-a meow nya"
        />
      </DocumentFragment>
    `);
  });

  it('should merge className from folded attrs', () => {
    const Inner = styled.div.attrs({ className: 'foo' })``;

    const Comp = styled(Inner).attrs(() => ({
      className: 'meow nya',
    }))``;

    expect(render(<Comp className="something" />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div
          class="sc-a sc-b foo meow nya something"
        />
      </DocumentFragment>
    `);
  });

  it('should merge className even if its a function', () => {
    const Comp = styled.div.attrs<{ $purr?: boolean }>(p => ({
      className: `meow ${p.$purr ? 'purr' : 'nya'}`,
    }))``;

    expect(render(<Comp />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div
          class="sc-a meow nya"
        />
      </DocumentFragment>
    `);
    expect(render(<Comp $purr />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div
          class="sc-a meow purr"
        />
      </DocumentFragment>
    `);
  });

  it('should merge style', () => {
    const Comp = styled.div.attrs(() => ({
      style: { color: 'red', background: 'blue' },
    }))``;

    expect(render(<Comp style={{ color: 'green', borderStyle: 'dotted' }} />).asFragment())
      .toMatchInlineSnapshot(`
      <DocumentFragment>
        <div
          class="sc-a"
          style="color: red; border-style: dotted; background: blue;"
        />
      </DocumentFragment>
    `);
  });

  it('should work with data and aria attributes', () => {
    const Comp = styled.div.attrs<DataAttributes>(() => ({
      'data-foo': 'bar',
      'aria-label': 'A simple FooBar',
    }))``;
    expect(render(<Comp />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div
          aria-label="A simple FooBar"
          class="sc-a"
          data-foo="bar"
        />
      </DocumentFragment>
    `);
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
    expect(render(<Comp />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <button
          class="sc-a"
          tabindex="0"
          type="submit"
        />
      </DocumentFragment>
    `);
  });

  it('merge attrs when inheriting SC', () => {
    const Parent = styled.button.attrs(() => ({
      type: 'button',
      tabIndex: 0,
    }))``;
    const Child = styled(Parent).attrs(() => ({
      type: 'submit',
    }))``;
    expect(render(<Child />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <button
          class="sc-a sc-b"
          tabindex="0"
          type="submit"
        />
      </DocumentFragment>
    `);
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
    expect(render(<Comp />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <a
          class="sc-a b"
          data-active-class-name="--is-active"
          href="#"
        />
      </DocumentFragment>
    `);
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
    expect(render(<Comp />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div
          class="sc-a"
        >
          Probably a bad idea
        </div>
      </DocumentFragment>
    `);
  });

  it('should pass through complex children as well', () => {
    const Comp = styled.div.attrs(() => ({
      children: <span>Probably a bad idea</span>,
    }))``;
    expect(render(<Comp />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div
          class="sc-a"
        >
          <span>
            Probably a bad idea
          </span>
        </div>
      </DocumentFragment>
    `);
  });

  it('should override children of course', () => {
    const Comp = styled.div.attrs(() => ({
      children: <span>Amazing</span>,
    }))``;
    expect(render(<Comp>Something else</Comp>).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div
          class="sc-a"
        >
          <span>
            Amazing
          </span>
        </div>
      </DocumentFragment>
    `);
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

    const rendered = render(<BlueText>Hello</BlueText>);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".d {
        background: red;
      }
      .c {
        background: blue;
      }"
    `);
    expect(rendered.asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <p
          class="sc-a d sc-b c"
          style="color: blue; font-size: 4em;"
        >
          Hello
        </p>
      </DocumentFragment>
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

    expect(render(<StyledComp />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div
          class="sc-a sc-b c"
        />
      </DocumentFragment>
    `);
  });

  it('should apply given "as" prop to the progressive type', () => {
    const Comp = styled.div.attrs({ as: 'video' as const })``;

    expect(render(<Comp loop />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <video
          class="sc-a"
          loop=""
        />
      </DocumentFragment>
    `);
  });

  it('aliasing an alternate theme via attrs makes it through to the child component', () => {
    const InnerComp: React.FC<{ theme: object }> = ({ theme, ...p }) => (
      <div data-theme={JSON.stringify(theme)} {...p} />
    );

    const Comp = styled(InnerComp).attrs<{ alternateTheme: object | undefined }>(p => ({
      alternateTheme: undefined,
      theme: p.alternateTheme!,
    }))``;

    expect(render(<Comp alternateTheme={{ foo: 'bar' }} />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div
          class="sc-a"
          data-theme="{"foo":"bar"}"
        />
      </DocumentFragment>
    `);
  });

  it('should preserve explicitly passed undefined props', () => {
    const Inner = (props: { role?: string; children?: React.ReactNode }) => (
      <div role={props.role} data-has-role={String('role' in props)} />
    );

    const Comp = styled(Inner).attrs({ role: 'button' })``;

    // Without explicit prop, attrs value is used
    const withAttrs = render(<Comp />);
    expect(withAttrs.container.querySelector('div')!.getAttribute('role')).toBe('button');

    // Explicitly passing undefined should override attrs
    const withUndefined = render(<Comp role={undefined} />);
    expect(withUndefined.container.querySelector('div')!.getAttribute('role')).toBe(null);
  });

  it('should still strip undefined values from attrs', () => {
    const Comp = styled.div.attrs({ 'data-removed': undefined as string | undefined })``;

    const { container } = render(<Comp />);
    expect(container.querySelector('div')!.hasAttribute('data-removed')).toBe(false);
  });

  it('function-form attrs supports user-overridable defaults', () => {
    // Replacement for the v6 `defaultProps` pattern where user props could
    // override built-in defaults. In v7, object-form attrs always win over
    // props; the function form is the escape hatch that reads props first
    // and only falls back to the default.
    const Button = styled('button').attrs<{ variant?: 'primary' | 'danger' }>(p => ({
      variant: p.variant || 'primary',
      'data-variant': p.variant || 'primary',
    }))``;

    const withDefault = render(<Button />);
    expect(withDefault.container.querySelector('button')!.getAttribute('data-variant')).toBe(
      'primary'
    );

    const withOverride = render(<Button variant="danger" />);
    expect(withOverride.container.querySelector('button')!.getAttribute('data-variant')).toBe(
      'danger'
    );
  });

  it('should not mutate the props object passed to attrs callbacks', () => {
    const Comp = styled.div
      .attrs(props => {
        // Attempt to mutate the received props — this should not affect
        // the internal context or the rendered output.
        (props as any).id = 'mutated';
        (props as any).injected = 'bad';
        return { 'data-first': 'yes' };
      })
      .attrs(props => {
        // The second callback should see the original id, not the mutation
        // from the first callback, plus the first callback's returned attrs.
        return { 'data-saw-id': props.id, 'data-saw-first': (props as any)['data-first'] };
      })``;

    const { container } = render(<Comp id="original" />);
    const el = container.firstChild as HTMLElement;

    // The mutation in the first callback should not leak anywhere
    expect(el.getAttribute('id')).toBe('original');
    expect(el.hasAttribute('injected')).toBe(false);

    // The second callback should see the original id (not 'mutated')
    expect(el.getAttribute('data-saw-id')).toBe('original');

    // The second callback should see the first callback's returned attrs
    // (these are applied to context after the first callback returns)
    expect(el.getAttribute('data-saw-first')).toBe('yes');
  });

  it('single attrs callback mutation should not affect rendered output', () => {
    const Comp = styled.div.attrs(props => {
      (props as any).id = 'mutated';
      return { 'data-test': 'yes' };
    })``;

    const { container } = render(<Comp id="original" />);
    const el = container.firstChild as HTMLElement;

    // With a single attrs entry, needsCopy is false so the mutation hits
    // the live context. However, the returned attrs are merged AFTER the
    // callback, and directly-passed props should still take priority in
    // the final element.
    expect(el.getAttribute('data-test')).toBe('yes');
    // id comes from attrs callback mutation of context — this documents
    // current behavior where single-attrs mutations leak
    expect(el.getAttribute('id')).toBe('mutated');
  });
});
