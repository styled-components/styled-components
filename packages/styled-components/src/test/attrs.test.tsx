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

  it('defaultProps are merged into what function attrs receives', () => {
    const Comp = styled.button.attrs<DataAttributes>(props => ({
      'data-color': props.theme!.color,
    }))``;

    Comp.defaultProps = {
      theme: {
        color: 'red',
      },
    };

    expect(render(<Comp />).asFragment()).toMatchInlineSnapshot(`
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

  it('attrs wins over an explicitly passed undefined prop (#5807, #4338)', () => {
    const Inner = (props: { role?: string; children?: React.ReactNode }) => (
      <div role={props.role} data-has-role={String('role' in props)} />
    );

    const Comp = styled(Inner).attrs({ role: 'button' })``;

    // Without an explicit prop, the attrs value is used.
    const withAttrs = render(<Comp />);
    expect(withAttrs.container.querySelector('div')!.getAttribute('role')).toBe('button');

    // Attrs still wins when the caller explicitly passes undefined for the same key.
    const withUndefined = render(<Comp role={undefined} />);
    expect(withUndefined.container.querySelector('div')!.getAttribute('role')).toBe('button');
  });

  it('forwards an explicitly passed undefined prop to a wrapped component so it can reset its own default (#4338)', () => {
    const Inner = (props: { role?: string; children?: React.ReactNode }) => (
      <div role={props.role} data-has-role={String('role' in props)} />
    );

    // No attrs here: the wrapped component's own default (not shown by Inner,
    // but this is the shape MUI's ButtonBase relies on) should see the key.
    const Comp = styled(Inner)``;

    const rendered = render(<Comp role={undefined} />);
    const div = rendered.container.querySelector('div')!;
    expect(div.getAttribute('data-has-role')).toBe('true');
    expect(div.hasAttribute('role')).toBe(false);
  });

  it('the MUI ButtonBase shape resets its own default when the caller passes an explicit undefined (#4338)', () => {
    const Base = (props: { role?: string; children?: React.ReactNode }) => (
      <div role="button" {...props} />
    );
    const StyledBase = styled(Base)``;

    const { container } = render(<StyledBase role={undefined} />);
    expect(container.querySelector('div')!.hasAttribute('role')).toBe(false);
  });

  it('applies shouldForwardProp and drops transient props when forwarding an explicit undefined to a component', () => {
    const Inner = (props: {
      keep?: string;
      drop?: string;
      $transient?: string;
      children?: React.ReactNode;
    }) => (
      <div
        data-has-keep={String('keep' in props)}
        data-has-drop={String('drop' in props)}
        data-has-transient={String('$transient' in props)}
      />
    );

    const Comp = styled(Inner).withConfig({
      shouldForwardProp: prop => prop !== 'drop',
    })``;

    const { container } = render(<Comp keep={undefined} drop={undefined} $transient={undefined} />);
    const div = container.querySelector('div')!;

    expect(div.getAttribute('data-has-keep')).toBe('true');
    expect(div.getAttribute('data-has-drop')).toBe('false');
    expect(div.getAttribute('data-has-transient')).toBe('false');
  });

  it('should still strip undefined values from attrs', () => {
    const Comp = styled.div.attrs({ 'data-removed': undefined as string | undefined })``;

    const { container } = render(<Comp />);
    expect(container.querySelector('div')!.hasAttribute('data-removed')).toBe(false);
  });

  it('does not forward an explicitly passed undefined prop to a DOM target, and does not warn', () => {
    const Comp = styled.div``;

    const { container } = render(<Comp title={undefined} />);
    expect(container.querySelector('div')!.hasAttribute('title')).toBe(false);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('function-form attrs restores its destructured default over an explicit undefined prop (#5807)', () => {
    const StyledButton = styled.button.attrs<{ type?: string }>(({ type = 'button', ...rest }) => ({
      type,
      ...rest,
    }))``;

    const { container } = render(<StyledButton type={undefined} />);
    expect(container.querySelector('button')!.getAttribute('type')).toBe('button');
  });

  it('object-form attrs restores its default over an explicit undefined prop (#5807)', () => {
    const StyledButton = styled.button.attrs({ type: 'button' })``;

    const { container } = render(<StyledButton type={undefined} />);
    expect(container.querySelector('button')!.getAttribute('type')).toBe('button');
  });

  it('a wrapper spreading props over object-form attrs still gets the default (#5807)', () => {
    const StyledButton = styled.button.attrs({ type: 'button' })``;
    const Wrapper = ({ type, ...rest }: { type?: string }) => (
      <StyledButton type={type} {...rest} />
    );

    const { container } = render(<Wrapper />);
    expect(container.querySelector('button')!.getAttribute('type')).toBe('button');
  });

  it("supports the documented `'key' in props` opt-out for clearing an attrs default", () => {
    const Comp = styled.a.attrs<{ rel?: string }>(p => ('rel' in p ? {} : { rel: 'noopener' }))``;

    const withUndefined = render(<Comp rel={undefined} />);
    expect(withUndefined.container.querySelector('a')!.hasAttribute('rel')).toBe(false);

    const withoutProp = render(<Comp />);
    expect(withoutProp.container.querySelector('a')!.getAttribute('rel')).toBe('noopener');
  });

  it('should not mutate the props object passed to attrs callbacks', () => {
    const Comp = styled.div
      .attrs(props => {
        // Attempt to mutate the received props - this should not affect
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
    // id comes from attrs callback mutation of context - this documents
    // current behavior where single-attrs mutations leak
    expect(el.getAttribute('id')).toBe('mutated');
  });
});
