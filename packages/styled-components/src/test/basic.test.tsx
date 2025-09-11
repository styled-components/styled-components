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
      expect(Outer.componentStyle).not.toEqual(Inner.componentStyle);
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
        ".d {
          color: red;
        }
        .c {
          color: green;
        }"
      `);
      expect(rendered.asFragment()).toMatchInlineSnapshot(`
        <DocumentFragment>
          <div
            class="sc-a d sc-b c"
          />
        </DocumentFragment>
      `);
    });

    it('folds defaultProps', () => {
      const Inner = styled.div``;

      Inner.defaultProps = {
        theme: {
          fontSize: 12,
        },
        style: {
          background: 'blue',
          textAlign: 'center',
        },
      };

      const Outer = styled(Inner)``;

      Outer.defaultProps = {
        theme: {
          fontSize: 16,
        },
        style: {
          background: 'silver',
        },
      };

      expect(Outer.defaultProps).toMatchInlineSnapshot(`
        {
          "style": {
            "background": "silver",
            "textAlign": "center",
          },
          "theme": {
            "fontSize": 16,
          },
        }
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
    let originalEnv: string | undefined;

    beforeEach(() => {
      originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should inject two different styles if the same compnoent is mounted with different props and css', () => {
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
});
