import { render } from '@testing-library/react';
import * as CSS from 'csstype';
import React from 'react';
import css from '../constructors/css';
import ThemeProvider from '../models/ThemeProvider';
import { AnyComponent, DataAttributes } from '../types';
import { getRenderedCSS, resetStyled } from './utils';

// Disable isStaticRules optimization since we're not
// testing for WebStyle specifics here
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

    expect(
      render(<Comp style={{ color: 'green', borderStyle: 'dotted' }} />).asFragment()
    ).toMatchInlineSnapshot(`
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

  it('an identity-spread attrs function still forwards an explicitly passed undefined prop to a wrapped component (#5807)', () => {
    const Inner = (props: { onClick?: () => void; children?: React.ReactNode }) => (
      <div data-has-onclick={String('onClick' in props)} />
    );

    const StyledInner = styled(Inner).attrs<{ type?: string }>(({ type = 'button', ...rest }) => ({
      type,
      ...rest,
    }))``;

    const { container } = render(<StyledInner onClick={undefined} />);
    expect(container.querySelector('div')!.getAttribute('data-has-onclick')).toBe('true');
  });

  it('attrs returning undefined for a key removes a value the caller passed, and keeps it out of a wrapped component', () => {
    const Comp = styled.div.attrs<{ 'data-foo'?: string }>(() => ({
      'data-foo': undefined,
    }))``;

    const { container } = render(<Comp data-foo="original" />);
    expect(container.querySelector('div')!.hasAttribute('data-foo')).toBe(false);

    const Inner = (props: { foo?: string; children?: React.ReactNode }) => (
      <div data-has-foo={String('foo' in props)} />
    );
    const Wrapped = styled(Inner).attrs<{ foo?: string }>(() => ({ foo: undefined }))``;

    const wrapped = render(<Wrapped foo="original" />);
    expect(wrapped.container.querySelector('div')!.getAttribute('data-has-foo')).toBe('false');
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

  it('keeps forwarding and clearing decisions across a re-render that hits the render cache', () => {
    const Inner = (props: { gone?: string; role?: string; children?: React.ReactNode }) => (
      <div data-has-gone={String('gone' in props)} data-has-role={String('role' in props)} />
    );
    const Comp = styled(Inner).attrs<{ gone?: string }>(() => ({ gone: undefined }))``;

    const { container, rerender } = render(<Comp gone="x" role={undefined} />);
    rerender(<Comp gone="x" role={undefined} />);

    const div = container.querySelector('div')!;
    expect(div.getAttribute('data-has-gone')).toBe('false');
    expect(div.getAttribute('data-has-role')).toBe('true');
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
        // Attempt to mutate the received props;this should not affect
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
    // id comes from attrs callback mutation of context;this documents
    // current behavior where single-attrs mutations leak
    expect(el.getAttribute('id')).toBe('mutated');
  });

  describe('attrs + extension composition', () => {
    it('should compose attrs through a 3-level extension chain', () => {
      const Base = styled.div.attrs({ 'data-level': '1', role: 'region' })`
        display: flex;
      `;
      const Mid = styled(Base).attrs({ 'data-level': '2', 'aria-label': 'card' })`
        color: blue;
      `;
      const Final = styled(Mid).attrs({ 'data-level': '3' })`
        font-size: 14px;
      `;
      const { container } = render(<Final />);
      const el = container.firstChild as HTMLElement;
      expect(el.getAttribute('data-level')).toBe('3');
      expect(el.getAttribute('role')).toBe('region');
      expect(el.getAttribute('aria-label')).toBe('card');
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".d {
          display: flex;
        }
        .e {
          color: blue;
        }
        .f {
          font-size: 14px;
        }"
      `);
    });

    it('should support function attrs chained with extension', () => {
      const Base = styled.div.attrs<{ $size?: 'sm' | 'lg' }>(p => ({
        'data-size': p.$size || 'sm',
      }))`
        display: flex;
      `;
      const Extended = styled(Base).attrs<{ $variant?: string }>(p => ({
        'data-variant': p.$variant || 'default',
      }))`
        color: ${p => (p.$variant === 'primary' ? 'blue' : 'gray')};
      `;
      const { container } = render(<Extended $size="lg" $variant="primary" />);
      const el = container.firstChild as HTMLElement;
      expect(el.getAttribute('data-size')).toBe('lg');
      expect(el.getAttribute('data-variant')).toBe('primary');
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".c {
          display: flex;
        }
        .d {
          color: blue;
        }"
      `);
    });

    it('should chain .attrs().attrs() on a single component', () => {
      const Comp = styled.div
        .attrs({ 'data-first': 'yes' })
        .attrs({ 'data-second': 'yes' })
        .attrs<{ $ready?: boolean }>(p => ({
          'data-ready': String(!!p.$ready),
        }))`
        padding: 8px;
      `;
      const { container } = render(<Comp $ready />);
      const el = container.firstChild as HTMLElement;
      expect(el.getAttribute('data-first')).toBe('yes');
      expect(el.getAttribute('data-second')).toBe('yes');
      expect(el.getAttribute('data-ready')).toBe('true');
    });

    it('should use as prop with attrs that reference props', () => {
      const Comp = styled.button.attrs<{ $href?: string }>(p => ({
        ...(p.$href ? { href: p.$href } : {}),
      }))`
        color: blue;
      `;
      const { container } = render(<Comp as="a" $href="https://example.com" />);
      const el = container.firstChild as HTMLElement;
      expect(el.tagName).toBe('A');
      expect(el.getAttribute('href')).toBe('https://example.com');
    });

    it('should merge css`` fragment with attrs-driven styles', () => {
      const highlight = css`
        background: yellow;
        color: black;
      `;
      const Comp = styled.div.attrs({ 'data-highlighted': 'true' })`
        ${highlight}
        padding: 4px 8px;
      `;
      const { container } = render(<Comp />);
      expect((container.firstChild as HTMLElement).getAttribute('data-highlighted')).toBe('true');
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          background: yellow;
          color: black;
          padding: 4px 8px;
        }"
      `);
    });
  });

  describe('outermost-wrapper style function (attrs marker contract)', () => {
    // Outermost attrs win across a wrapped chain, and every layer's interpolations see
    // the resolved value, so a layer runs the style function only when the marker is its own id.
    let nextLayerId: number;
    let systemStyles: jest.Mock<string, [Record<string, unknown>]>;

    const createLayer = (tag: any, options: { withStyleFunction?: boolean } = {}) => {
      const layerId = ++nextLayerId;
      const layerStyles = (props: Record<string, unknown>) =>
        props.$styleOwner === layerId ? systemStyles(props) : null;

      return (strings: TemplateStringsArray, ...exprs: any[]) =>
        styled(tag).attrs({ $styleOwner: layerId })(
          strings,
          ...exprs,
          ...(options.withStyleFunction === false ? [] : [layerStyles])
        );
    };

    beforeEach(() => {
      nextLayerId = 0;
      systemStyles = jest.fn(() => 'margin: 7px;');
    });

    it('runs the style function once per render of the outer layer, in the outer rule only', () => {
      const Inner = createLayer('div')`
        color: red;
      `;
      const Outer = createLayer(Inner)`
        padding: 1px;
      `;

      render(<Outer />);

      expect(systemStyles).toHaveBeenCalledTimes(1);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".c {
          color: red;
        }
        .d {
          padding: 1px;
          margin: 7px;
        }"
      `);
    });

    it('still runs the style function for the inner layer rendered alone, after the outer layer exists', () => {
      const Inner = createLayer('div')`
        color: red;
      `;
      createLayer(Inner)`
        padding: 1px;
      `;

      render(<Inner />);

      expect(systemStyles).toHaveBeenCalledTimes(1);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".c {
          color: red;
          margin: 7px;
        }"
      `);
    });

    it('runs the style function once for three layers, in the outermost rule only', () => {
      const Base = createLayer('div')`
        color: red;
      `;
      const Middle = createLayer(Base)`
        padding: 1px;
      `;
      const Top = createLayer(Middle)`
        display: block;
      `;

      render(<Top />);

      expect(systemStyles).toHaveBeenCalledTimes(1);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".d {
          color: red;
        }
        .e {
          padding: 1px;
        }
        .f {
          display: block;
          margin: 7px;
        }"
      `);
    });

    it('runs the style function nowhere when the outer layer sets the marker without a style function', () => {
      const Inner = createLayer('div')`
        color: red;
      `;
      const Outer = createLayer(Inner, { withStyleFunction: false })`
        padding: 1px;
      `;

      render(<Outer />);

      expect(systemStyles).not.toHaveBeenCalled();
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".c {
          color: red;
        }
        .d {
          padding: 1px;
        }"
      `);
    });

    it('does not forward the marker to the DOM', () => {
      const Inner = createLayer('div')``;
      const Outer = createLayer(Inner)``;
      const { container } = render(<Outer />);
      const el = container.firstChild as HTMLElement;

      expect(el.getAttributeNames()).toEqual(['class']);
    });
  });

  describe('post-compile (arity-2 ast)', () => {
    it('lifts a static decl into a prop via ast.pop and overrides via inline style', () => {
      const Comp = styled.div.attrs<{ 'data-tint'?: string }>((_p, ast) => ({
        'data-tint': ast.pop('color'),
      }))`
        color: red;
        padding: 4px;
      `;
      const { container } = render(<Comp />);
      const el = container.firstChild as HTMLElement;
      expect(el.getAttribute('data-tint')).toBe('red');
      // pop emits `unset` inline-style for the popped property; user `style`
      // keys still win on web.
      expect(el.style.color).toBe('unset');
    });

    it('reads without removing via ast.peek', () => {
      const Comp = styled.div.attrs<{ 'data-tint'?: string }>((_p, ast) => ({
        'data-tint': ast.peek('color'),
      }))`
        color: blue;
      `;
      const { container } = render(<Comp />);
      const el = container.firstChild as HTMLElement;
      expect(el.getAttribute('data-tint')).toBe('blue');
      // peek does not emit an inline-style override.
      expect(el.style.color).toBe('');
    });

    it('applies an arity-2 callback added when extending a styled component that has none', () => {
      const Base = styled.div`
        color: red;
      `;
      const Extended = styled(Base).attrs<{ 'data-tint'?: string }>((_p, ast) => ({
        'data-tint': ast.peek('color'),
      }))``;
      const { container } = render(<Extended />);
      expect((container.firstChild as HTMLElement).getAttribute('data-tint')).toBe('red');
    });

    it("keeps a base's arity-2 callback reading the whole chain when an extension adds only CSS", () => {
      const Base = styled.div.attrs<{ 'data-tint'?: string; 'data-pad'?: string }>((_p, ast) => ({
        'data-pad': ast.peek('padding'),
        'data-tint': ast.peek('color'),
      }))`
        color: red;
      `;
      const Extended = styled(Base)`
        padding: 4px;
      `;
      const el = render(<Extended />).container.firstChild as HTMLElement;
      expect([el.getAttribute('data-tint'), el.getAttribute('data-pad')]).toEqual(['red', '4px']);
    });

    it('reads the base declarations from an extension callback that bails to the render-time path', () => {
      const Base = styled.div<{ $on?: boolean }>`
        color: ${p => (p.$on ? 'green' : 'red')};
      `;
      const Extended = styled(Base).attrs<{ 'data-tint'?: string }>((p, ast) => ({
        'data-tint': p.$on ? ast.peek('color') : 'off',
      }))``;
      const el = render(<Extended $on />).container.firstChild as HTMLElement;
      expect(el.getAttribute('data-tint')).toBe('green');
    });

    it("reads the extension's value when base and extension declare the same property", () => {
      const Base = styled.div`
        color: red;
      `;
      const Extended = styled(Base).attrs<{ 'data-tint'?: string }>((_p, ast) => ({
        'data-tint': ast.pop('color'),
      }))`
        color: blue;
      `;
      const el = render(<Extended />).container.firstChild as HTMLElement;
      // The extension's class is emitted after the base's, so its value is
      // the one the cascade applies, and the one pop lifts and unsets.
      expect([el.getAttribute('data-tint'), el.style.color]).toEqual(['blue', 'unset']);
    });

    it('reads the last declaration when one template repeats a property', () => {
      const Comp = styled.div.attrs<{ 'data-tint'?: string }>((_p, ast) => ({
        'data-tint': ast.pop('color'),
      }))`
        color: red;
        color: blue;
      `;
      const el = render(<Comp />).container.firstChild as HTMLElement;
      expect([el.getAttribute('data-tint'), el.style.color]).toEqual(['blue', 'unset']);
    });

    it('reads a base declaration whose template has no trailing `;`', () => {
      const Base = styled.div`color: red`;
      const Extended = styled(Base).attrs<{ 'data-tint'?: string }>((_p, ast) => ({
        'data-tint': ast.peek('color'),
      }))`
        padding: 4px;
      `;
      const el = render(<Extended />).container.firstChild as HTMLElement;
      // Web compiles each level's template separately, so the base's last
      // declaration ends at its own template boundary.
      expect(el.getAttribute('data-tint')).toBe('red');
    });

    it('camelizes a kebab-case key popped by a render-time callback into the inline style', () => {
      const error = jest.spyOn(console, 'error').mockImplementation(() => {});
      const Comp = styled.div.attrs<{ 'data-bg'?: string; $on?: boolean }>((p, ast) => ({
        'data-bg': p.$on ? ast.pop('background-color') : 'off',
      }))`
        background-color: red;
      `;
      const el = render(<Comp $on />).container.firstChild as HTMLElement;
      expect([el.getAttribute('data-bg'), el.style.backgroundColor]).toEqual(['red', 'unset']);
      expect(error.mock.calls).toEqual([]);
      error.mockRestore();
    });

    it('pops a custom property by its verbatim name and unsets it inline', () => {
      const Comp = styled.div.attrs<{ 'data-tint'?: string; $on?: boolean }>((p, ast) => ({
        'data-tint': p.$on ? ast.pop('--tint') : 'off',
      }))`
        --tint: red;
      `;
      const el = render(<Comp $on />).container.firstChild as HTMLElement;
      expect([el.getAttribute('data-tint'), el.style.getPropertyValue('--tint')]).toEqual([
        'red',
        'unset',
      ]);
    });

    it('user style prop overrides pop inline-style override', () => {
      const Comp = styled.div.attrs<{ 'data-tint'?: string }>((_p, ast) => ({
        'data-tint': ast.pop('color'),
      }))`
        color: red;
      `;
      const { container } = render(<Comp style={{ color: 'green' }} />);
      const el = container.firstChild as HTMLElement;
      expect(el.getAttribute('data-tint')).toBe('red');
      // User-provided `style` value wins over the pop's `unset`.
      expect(el.style.color).toBe('green');
    });

    it('arity-1 attrs continue to flow through the legacy pre-compile path', () => {
      const Comp = styled.div.attrs<{ 'data-tag'?: string }>(() => ({
        'data-tag': 'tagged',
      }))`
        color: orange;
      `;
      const { container } = render(<Comp />);
      const el = container.firstChild as HTMLElement;
      expect(el.getAttribute('data-tag')).toBe('tagged');
      expect(el.style.color).toBe('');
    });

    it('peek returns undefined for non-existent decls', () => {
      const Comp = styled.div.attrs<{ 'data-tint'?: string }>((_p, ast) => ({
        'data-tint': ast.peek('color'),
      }))`
        padding: 4px;
      `;
      const { container } = render(<Comp />);
      const el = container.firstChild as HTMLElement;
      // Decl missing → returns undefined → omitted from rendered attrs.
      expect(el.getAttribute('data-tint')).toBeNull();
    });

    it('pop/peek accept a fallback value when the decl is missing', () => {
      const Comp = styled.div.attrs<{ 'data-a'?: string; 'data-b'?: string }>((_p, ast) => ({
        'data-a': ast.pop('color', 'fallback-a'),
        'data-b': ast.peek('color', 'fallback-b'),
      }))`
        padding: 4px;
      `;
      const { container } = render(<Comp />);
      const el = container.firstChild as HTMLElement;
      expect(el.getAttribute('data-a')).toBe('fallback-a');
      expect(el.getAttribute('data-b')).toBe('fallback-b');
    });

    it('resolves a templated decl via interpolation', () => {
      const Comp = styled.div.attrs<{ 'data-tint'?: string }>((_p, ast) => ({
        'data-tint': ast.pop('color'),
      }))`
        color: ${(p: { theme: { c: string } }) => p.theme.c};
      `;
      const { container } = render(
        <ThemeProvider theme={{ c: 'purple' }}>
          <Comp />
        </ThemeProvider>
      );
      const el = container.firstChild as HTMLElement;
      expect(el.getAttribute('data-tint')).toBe('purple');
    });

    it('static decl + static callback: callback is not invoked at render time', () => {
      const cb = jest.fn((_p: any, ast: any) => ({
        'data-tint': ast.pop('color'),
      }));
      const Comp = styled.div.attrs<{ 'data-tint'?: string }>(cb)`
        color: red;
      `;
      // Construction-time trace called the callback once. Clear, then assert
      // that subsequent renders do NOT invoke it again;the plan supplies
      // the output and the popped set without running user code.
      cb.mockClear();
      const { rerender, container } = render(<Comp />);
      rerender(<Comp />);
      rerender(<Comp />);
      expect(cb).not.toHaveBeenCalled();
      expect((container.firstChild as HTMLElement).getAttribute('data-tint')).toBe('red');
    });

    it('templated decl falls back to per-render invocation', () => {
      const cb = jest.fn((_p: any, ast: any) => ({
        'data-tint': ast.pop('color'),
      }));
      const Comp = styled.div.attrs<{ 'data-tint'?: string }>(cb)`
        color: ${(p: { theme: { c: string } }) => p.theme.c};
      `;
      cb.mockClear();
      render(
        <ThemeProvider theme={{ c: 'purple' }}>
          <Comp />
        </ThemeProvider>
      );
      // Trace bailed (templated decl); render path invoked the callback.
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('pop with a dotted path resolves a value from the active theme', () => {
      const Comp = styled.div.attrs<{ 'data-tint'?: string }>((_p, ast) => ({
        'data-tint': ast.pop('palette.brand'),
      }))``;
      const { container } = render(
        <ThemeProvider theme={{ palette: { brand: '#abc123' } }}>
          <Comp />
        </ThemeProvider>
      );
      const el = container.firstChild as HTMLElement;
      expect(el.getAttribute('data-tint')).toBe('#abc123');
    });

    it('peek with a dotted path also reads from the theme', () => {
      const Comp = styled.div.attrs<{ 'data-tint'?: string }>((_p, ast) => ({
        'data-tint': ast.peek('palette.brand'),
      }))``;
      const { container } = render(
        <ThemeProvider theme={{ palette: { brand: '#fed' } }}>
          <Comp />
        </ThemeProvider>
      );
      expect((container.firstChild as HTMLElement).getAttribute('data-tint')).toBe('#fed');
    });

    it('a missing theme path returns undefined', () => {
      const Comp = styled.div.attrs<{ 'data-tint'?: string }>((_p, ast) => ({
        'data-tint': ast.pop('palette.missing') ?? 'fallback',
      }))``;
      const { container } = render(
        <ThemeProvider theme={{ palette: { brand: '#fed' } }}>
          <Comp />
        </ThemeProvider>
      );
      expect((container.firstChild as HTMLElement).getAttribute('data-tint')).toBe('fallback');
    });

    it('theme path with fallback returns the fallback when missing', () => {
      const Comp = styled.div.attrs<{ 'data-tint'?: string }>((_p, ast) => ({
        'data-tint': ast.pop('palette.missing', 'baked-fallback'),
      }))``;
      const { container } = render(
        <ThemeProvider theme={{ palette: { brand: '#fed' } }}>
          <Comp />
        </ThemeProvider>
      );
      expect((container.firstChild as HTMLElement).getAttribute('data-tint')).toBe(
        'baked-fallback'
      );
    });

    it('callback that reads props falls back to per-render invocation', () => {
      const cb = jest.fn((p: any, ast: any) => ({
        'data-tint': p.$on ? ast.pop('color') : 'off',
      }));
      const Comp = styled.div.attrs<{ $on?: boolean; 'data-tint'?: string }>(cb)`
        color: red;
      `;
      cb.mockClear();
      const { container } = render(<Comp $on />);
      // Props read at trace time → bail → callback runs at render.
      expect(cb).toHaveBeenCalled();
      expect((container.firstChild as HTMLElement).getAttribute('data-tint')).toBe('red');
    });
  });
});
