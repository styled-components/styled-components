import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React, { Component, CSSProperties, StrictMode } from 'react';
import { AnyComponent } from '../types';
import hoist from '../utils/hoist';
import { getRenderedCSS, resetStyled } from './utils';

let styled: ReturnType<typeof resetStyled>;

describe('basic', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  it('should not throw an error when called with a valid element', () => {
    expect(() => styled.div``).not.toThrow();

    const FunctionalComponent = () => <div />;
    class ClassComponent extends Component<any, any> {
      render() {
        return <div />;
      }
    }
    const validComps = ['div' as const, FunctionalComponent, ClassComponent];
    validComps.forEach(comp => {
      expect(() => {
        const Comp = styled(comp)``;
        render(<Comp />);
      }).not.toThrow();
    });
  });

  it('should not inject anything by default', () => {
    styled.div``;

    expect(getRenderedCSS()).toMatchInlineSnapshot(`""`);
  });

  it('should inject styles', () => {
    const Comp = styled.div`
      color: blue;
    `;
    render(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        color: blue;
      }"
    `);
  });

  it("should inject only once for a styled component, no matter how often it's mounted", () => {
    const Comp = styled.div`
      color: blue;
    `;
    render(<Comp />);
    render(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        color: blue;
      }"
    `);
  });

  it('should inject two different styles if the same component is mounted with different props and css', () => {
    const Comp = styled.div<{ $variant: 'text' | 'background' }>`
      color: ${props => props.$variant == 'text' && 'red'};
      background-color: ${props => props.$variant == 'background' && 'red'};
    `;
    render(<Comp $variant="text" />);
    render(<Comp $variant="background" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        color: red;
      }
      .c {
        background-color: red;
      }"
    `);
  });

  it('Should have the correct styled(component) displayName', () => {
    const CompWithoutName = () => (() => <div />) as React.FC<any>;

    const StyledTag = styled.div``;
    expect(StyledTag.displayName).toBe('styled.div');

    const CompWithName: React.FC<any> = () => <div />;
    CompWithName.displayName = undefined;
    const StyledCompWithName = styled(CompWithName)``;
    expect(StyledCompWithName.displayName).toBe('Styled(CompWithName)');

    const CompWithDisplayName = CompWithoutName();
    CompWithDisplayName.displayName = 'displayName';
    const StyledCompWithDisplayName = styled(CompWithDisplayName)``;
    expect(StyledCompWithDisplayName.displayName).toBe('Styled(displayName)');

    const CompWithBoth = () => <div />;
    CompWithBoth.displayName = 'displayName';
    const StyledCompWithBoth = styled(CompWithBoth)``;
    expect(StyledCompWithBoth.displayName).toBe('Styled(displayName)');

    const CompWithNothing = CompWithoutName();
    CompWithNothing.displayName = undefined;
    const StyledCompWithNothing = styled(CompWithNothing)``;
    expect(StyledCompWithNothing.displayName).toBe('Styled(Component)');
  });

  it('should allow you to pass in style objects', () => {
    const Comp = styled.div({
      color: 'blue',
    });
    render(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        color: blue;
      }"
    `);
  });

  it('should allow you to pass in style object with a function', () => {
    const Comp = styled.div({ color: ({ color }) => color });
    render(<Comp color="blue" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        color: blue;
      }"
    `);
  });

  it('should allow you to pass in style nested object', () => {
    const Comp = styled.div({
      span: {
        small: {
          color: 'blue',
          fontFamily: 'sans-serif',
        },
      },
    });
    render(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b span small {
        color: blue;
        font-family: sans-serif;
      }"
    `);
  });

  it('should allow you to pass in style nested object with a function', () => {
    const Comp = styled.div<{ color?: string }>({
      span: {
        small: {
          color: ({ color }) => color,
          fontFamily: 'sans-serif',
        },
      },
    });
    render(<Comp color="red" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b span small {
        color: red;
        font-family: sans-serif;
      }"
    `);
  });

  it('should allow you to pass in a function returning a style object', () => {
    const Comp = styled.div<{ color: Exclude<CSSProperties['color'], undefined> }>(({ color }) => ({
      color,
    }));
    render(<Comp color="blue" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        color: blue;
      }"
    `);
  });

  it('emits the correct selector when a StyledComponent is interpolated into a template string', () => {
    const Comp = styled.div`
      color: red;
    `;

    expect(`${Comp}`).toBe(`.${Comp.styledComponentId}`);
  });

  it('works with the React 16.6 "memo" API', () => {
    const Comp = React.memo(props => <div {...props} />);
    const StyledComp = styled(Comp)`
      color: red;
    `;

    render(<StyledComp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        color: red;
      }"
    `);
  });

  it('does not filter outs custom props for uppercased string-like components', async () => {
    const Comp = styled('Comp')<{ customProp: string }>`
      color: red;
    `;
    const wrapper = render(<Comp data-testid="subject" customProp="abc" />);
    expect(await wrapper.findByTestId('subject')).toHaveAttribute('customProp', 'abc');
  });

  it('creates a proper displayName for uppercased string-like components', () => {
    const Comp = styled('Comp')`
      color: red;
    `;

    expect(Comp.displayName).toBe('Styled(Comp)');
  });

  it('works with custom elements (use class instead of className)', () => {
    const Comp = styled('custom-element')`
      color: red;
    `;

    expect(render(<Comp />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <custom-element
          class="sc-a b"
        />
      </DocumentFragment>
    `);
  });

  describe('jsdom tests', () => {
    class InnerComponent extends Component<any, any> {
      render() {
        return <div {...this.props} />;
      }
    }

    it('should pass the full className to the wrapped child', () => {
      const OuterComponent = styled(InnerComponent)``;

      class Wrapper extends Component<any, any> {
        render() {
          return <OuterComponent data-testid="subject" className="test" />;
        }
      }

      const wrapper = render(<Wrapper />);
      expect(wrapper.findByTestId('subject')).resolves.toHaveAttribute('class', 'sc-a test');
    });

    it('should pass the ref to the component', async () => {
      let ref = React.createRef<HTMLDivElement>();

      const Comp = styled.div``;

      class Wrapper extends Component<any, any> {
        render() {
          return (
            <div>
              <Comp data-testid="subject" ref={ref} />
            </div>
          );
        }
      }

      const wrapper = render(<Wrapper />);
      const component = await wrapper.findByTestId('subject');

      expect(ref.current).toBe(component);
    });

    it('should pass the ref to the wrapped styled component', () => {
      let ref = React.createRef<InstanceType<typeof Inner>>();

      class Inner extends React.Component {
        render() {
          return <div data-testid="subject" {...this.props} />;
        }
      }

      const Outer = styled(Inner)``;

      class Wrapper extends Component<any, any> {
        render() {
          return (
            <div>
              <Outer ref={ref} />
            </div>
          );
        }
      }

      render(<Wrapper />);
      expect(ref.current).toBeInstanceOf(Inner);
    });

    it('should respect the order of StyledComponent creation for CSS ordering', () => {
      const FirstComponent = styled.div`
        color: red;
      `;
      const SecondComponent = styled.div`
        color: blue;
      `;

      // NOTE: We're mounting second before first and check if we're breaking their order
      render(<SecondComponent />);
      render(<FirstComponent />);

      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".d {
          color: red;
        }
        .c {
          color: blue;
        }"
      `);
    });

    it('handle media at-rules inside style rules', () => {
      const Comp = styled.div`
        > * {
          @media (min-width: 500px) {
            color: pink;
          }
        }
      `;

      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "@media (min-width:500px) {
          .b > * {
            color: pink;
          }
        }"
      `);
    });

    it('should handle container queries inside style rules', () => {
      const Comp = styled.div`
        background: blue;
        container-type: inline-size;

        @container (width > 30px) {
          background: red;
        }
      `;

      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          background: blue;
          container-type: inline-size;
          container-name: sc-a;
        }
        @container (width > 30px) {
          .b {
            background: red;
          }
        }"
      `);
    });

    it('should hoist non-react static properties on styled primitives', () => {
      const Inner = styled.div<{}, { foo: string }>``;
      Inner.foo = 'bar';

      const Outer = styled(Inner)``;

      expect(Outer).toHaveProperty('foo', 'bar');
    });

    it('should hoist non-react static properties on wrapped components', () => {
      const Inner = styled('div')<{}, { foo: string }>``;
      Inner.foo = 'bar';

      const Outer = styled(Inner)``;

      expect(Outer).toHaveProperty('foo', 'bar');
    });

    it('should not hoist styled component statics', () => {
      const Inner = styled.div``;
      const Outer = styled(Inner)``;

      expect(Outer.styledComponentId).not.toBe(Inner.styledComponentId);
      expect(Outer.webStyle).not.toEqual(Inner.webStyle);
    });

    it('should not fold components if there is an interim HOC', () => {
      function withSomething(WrappedComponent: AnyComponent) {
        const WithSomething: React.FC<any> = props => {
          return <WrappedComponent {...props} />;
        };

        hoist(WithSomething, WrappedComponent);

        return WithSomething;
      }

      const Inner = withSomething(styled.div`
        color: red;
      `);

      const Outer = styled(Inner)`
        color: green;
      `;

      const rendered = render(<Outer />);

      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".c {
          color: red;
        }
        .d {
          color: green;
        }"
      `);
      expect(rendered.asFragment()).toMatchInlineSnapshot(`
        <DocumentFragment>
          <div
            class="sc-a sc-b c d"
          />
        </DocumentFragment>
      `);
    });

    it('merges attrs across an extended chain', () => {
      const Inner = styled.div.attrs({
        style: {
          background: 'blue',
          textAlign: 'center',
        },
      })``;

      const Outer = styled(Inner).attrs({
        style: {
          background: 'silver',
        },
      })``;

      const { asFragment } = render(<Outer />);

      expect(asFragment().firstChild).toMatchInlineSnapshot(`
        <div
          class="sc-a sc-b"
          style="background: silver; text-align: center;"
        />
      `);
    });

    it('generates unique classnames when not using babel', () => {
      const Named1 = styled.div.withConfig({ displayName: 'Name' })`
        color: blue;
      `;

      const Named2 = styled.div.withConfig({ displayName: 'Name' })`
        color: red;
      `;

      expect(Named1.styledComponentId).not.toBe(Named2.styledComponentId);
    });

    it('honors a passed componentId', () => {
      const Named1 = styled.div.withConfig({
        componentId: 'foo',
        displayName: 'Name',
      })`
        color: blue;
      `;

      const Named2 = styled.div.withConfig({
        componentId: 'bar',
        displayName: 'Name',
      })`
        color: red;
      `;

      expect(Named1.styledComponentId).toBe('Name-foo');
      expect(Named2.styledComponentId).toBe('Name-bar');
    });

    // this no longer is possible in React 16.6 because
    // of the deprecation of findDOMNode; need to find an alternative
    it('should work in StrictMode without warnings', () => {
      const Comp = styled.div``;

      render(
        <StrictMode>
          <Comp />
        </StrictMode>
      );

      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('extending a ruleless component (#5727)', () => {
    it('applies the new rules when wrapping an empty styled component', () => {
      const Inner = styled(({ className }: { className?: string }) => (
        <span data-testid="inner" className={className}>
          inner
        </span>
      ))``;
      const Outer = styled(Inner)`
        color: red;
        width: 100px;
      `;

      const { getByTestId } = render(<Outer />);
      const className = getByTestId('inner').className;
      const css = getRenderedCSS();

      expect(css).toMatchInlineSnapshot(`
        ".c {
          color: red;
          width: 100px;
        }"
      `);
      expect(className.split(/\s+/)).toMatchInlineSnapshot(`
        [
          "sc-a",
          "sc-b",
          "c",
        ]
      `);
    });
  });

  describe('warnings', () => {
    beforeEach(() => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('does not warn for innerRef if using a custom component', () => {
      const InnerComp: React.FC<any> = props => <div {...props} />;
      const Comp = styled(InnerComp)``;
      const ref = React.createRef();

      render(<Comp innerRef={ref} />);
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('does not warn if the className is consumed by a deeper child', () => {
      const Inner: React.FC<any> = ({ className }) => (
        <div>
          <span className={className} />
        </div>
      );

      const Comp = styled(Inner)`
        color: red;
      `;

      render(
        <div>
          <Comp />
        </div>
      );

      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('production mode', () => {
    beforeEach(() => {
      (global as { __DEV__: boolean }).__DEV__ = false;
    });

    afterEach(() => {
      (global as { __DEV__: boolean }).__DEV__ = true;
    });

    it('should inject two different styles if the same component is mounted with different props and css', () => {
      const Comp = styled.div<{ $variant: 'text' | 'background' }>`
        color: ${props => props.$variant == 'text' && 'red'};
        background-color: ${props => props.$variant == 'background' && 'red'};
      `;
      render(<Comp $variant="text" />);
      render(<Comp $variant="background" />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          color: red;
        }
        .c {
          background-color: red;
        }"
      `);
    });
  });

  describe('deep inheritance chains', () => {
    it('should render a 4-level inheritance chain with styles at each level', () => {
      const L1 = styled.div`
        display: flex;
      `;
      const L2 = styled(L1)`
        color: blue;
      `;
      const L3 = styled(L2)`
        font-size: 14px;
      `;
      const L4 = styled(L3)`
        opacity: 0.9;
      `;
      render(<L4 />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".e {
          display: flex;
        }
        .f {
          color: blue;
        }
        .g {
          font-size: 14px;
        }
        .h {
          opacity: 0.9;
        }"
      `);
    });

    it('should render a 4-level chain with dynamic styles at various levels', () => {
      const L1 = styled.div`
        display: ${() => 'flex'};
      `;
      const L2 = styled(L1)`
        color: blue;
      `;
      const L3 = styled(L2)<{ $size: number }>`
        font-size: ${p => p.$size}px;
      `;
      const L4 = styled(L3)`
        opacity: 0.9;
      `;
      render(<L4 $size={14} />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".e {
          display: flex;
        }
        .f {
          color: blue;
        }
        .g {
          font-size: 14px;
        }
        .h {
          opacity: 0.9;
        }"
      `);
    });

    it('should forward refs through a deep inheritance chain', () => {
      const ref = React.createRef<HTMLDivElement>();
      const L1 = styled.div`
        display: flex;
      `;
      const L2 = styled(L1)`
        color: blue;
      `;
      const L3 = styled(L2)`
        font-size: 14px;
      `;
      render(<L3 ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should apply attrs from multiple levels in a chain', () => {
      const L1 = styled.div.attrs({ 'data-level': '1' })`
        display: flex;
      `;
      const L2 = styled(L1).attrs({ 'data-level': '2' })`
        color: blue;
      `;
      const L3 = styled(L2).attrs({ 'data-extra': 'yes' })`
        font-size: 14px;
      `;
      const { container } = render(<L3 />);
      const el = container.firstChild as HTMLElement;
      expect(el.getAttribute('data-level')).toBe('2');
      expect(el.getAttribute('data-extra')).toBe('yes');
    });
  });

  describe('as prop with attrs and styles', () => {
    it('should support as prop on a styled component with attrs', () => {
      const Comp = styled.button.attrs({ type: 'button', role: 'button' })<{
        $bold?: boolean;
      }>`
        font-weight: ${p => (p.$bold ? 'bold' : 'normal')};
      `;
      const { container } = render(<Comp as="a" $bold />);
      const el = container.firstChild as HTMLElement;
      expect(el.tagName).toBe('A');
      expect(el.getAttribute('type')).toBe('button');
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          font-weight: bold;
        }"
      `);
    });

    it('should support as prop on an extended component with attrs at both levels', () => {
      const Base = styled.div.attrs({ 'data-base': 'true' })`
        display: flex;
      `;
      const Ext = styled(Base).attrs({ 'data-ext': 'true' })`
        color: red;
      `;
      const { container } = render(<Ext as="section" />);
      const el = container.firstChild as HTMLElement;
      expect(el.tagName).toBe('SECTION');
      expect(el.getAttribute('data-base')).toBe('true');
      expect(el.getAttribute('data-ext')).toBe('true');
    });
  });
});
