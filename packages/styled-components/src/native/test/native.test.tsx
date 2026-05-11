import React, { PropsWithChildren } from 'react';
import { Image, Text, TextInput, View, ViewProps } from 'react-native';
import TestRenderer from 'react-test-renderer';
import styled, { ThemeProvider, css, toStyleSheet } from '../';
import { resetStyleCache, RN_UNSUPPORTED_VALUES } from '../../models/NativeStyle';

// NOTE: These tests are like the ones for Web but a "light-version" of them
// This is mostly due to the similar logic

describe('native', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('should not throw an error when called with a valid element', () => {
    expect(() => styled.View``).not.toThrow();

    const FunctionalComponent = () => <View />;
    class ClassComponent extends React.Component {
      render() {
        return <View />;
      }
    }
    const validComps = ['View', FunctionalComponent, ClassComponent];
    validComps.forEach(comp => {
      expect(() => {
        // @ts-expect-error invalid input
        const Comp = styled(comp)``;
        TestRenderer.create(<Comp />);
      }).not.toThrow();
    });
  });

  it('should generate inline styles', () => {
    const Comp = styled.View``;
    const wrapper = TestRenderer.create(<Comp />);
    const view = wrapper.root.findByType(View);

    expect(view.props.style).toEqual({});
  });

  it('should fold successive styled() wrappings', () => {
    const Comp = styled.Text`
      color: red;
    `;

    const Comp2 = styled(Comp)`
      text-align: left;
    `;

    const wrapper = TestRenderer.create(<Comp2 />);
    const view = wrapper.root.findByType(Text);

    expect(view.props.style).toEqual({ color: 'red', textAlign: 'left' });
  });

  it('propagates attrs across an extended chain', () => {
    const Inner = styled.View.attrs<ViewProps & { testID?: string }>({
      testID: 'inner-default',
    })``;

    const Outer = styled(Inner).attrs({
      accessibilityLabel: 'outer-default',
    })``;

    const wrapper = TestRenderer.create(<Outer />);
    const view = wrapper.root.findByType(View);

    expect(view.props.testID).toBe('inner-default');
    expect(view.props.accessibilityLabel).toBe('outer-default');
  });

  it('should combine inline styles and the style prop', () => {
    const Comp = styled.View`
      padding-top: 10px;
    `;

    const style = { opacity: 0.9 };
    const wrapper = TestRenderer.create(<Comp style={style} />);
    const view = wrapper.root.findByType(View);

    expect(view.props.style).toEqual([{ paddingTop: 10 }, style]);
  });

  it('should not console.warn if a comment is seen', () => {
    const oldConsoleWarn = console.warn;
    console.warn = jest.fn();
    try {
      styled.View`
        /* this is a comment */
      `;

      expect(console.warn).not.toHaveBeenCalled();
    } finally {
      console.warn = oldConsoleWarn;
    }
  });

  // https://github.com/styled-components/styled-components/issues/1266
  it('should update when props change', () => {
    const Comp = styled.View<{ opacity?: number }>`
      padding-top: 5px;
      opacity: ${p => p.opacity || 0};
    `;

    const wrapper = TestRenderer.create(<Comp opacity={0.5} />);

    expect(wrapper.root.findByType(View).props.style).toEqual({ paddingTop: 5, opacity: 0.5 });

    wrapper.update(<Comp opacity={0.9} />);

    expect(wrapper.root.findByType(View).props.style).toEqual({ paddingTop: 5, opacity: 0.9 });
  });

  it('should forward the "as" prop if "forwardedAs" is used', () => {
    const Comp = ({ as: Component = View, ...props }) => <Component {...props} />;

    const Comp2 = styled(Comp)`
      background: red;
    `;

    const wrapper = TestRenderer.create(<Comp2 forwardedAs={Text} />);

    expect(wrapper.root.findByType(Text)).not.toBeUndefined();
  });

  it('should not add different border values for Image component as its not supported', () => {
    const Comp = styled.Image`
      border-width: 10px;
      border-color: red;
    `;

    const loremPicsumUri = 'https://picsum.photos/200/300';

    const wrapper = TestRenderer.create(<Comp source={{ uri: loremPicsumUri }} />);
    const image = wrapper.root.findByType(Image);

    expect(image.props.style).toEqual({ borderWidth: 10, borderColor: 'red' });
  });

  it('should warn all css unsupported values', () => {
    RN_UNSUPPORTED_VALUES.forEach(value => {
      const Box = styled.View`
        width: ${value};
        height: 20px;
      `;
      const testInstance = TestRenderer.create(<Box />);
      const styleProp = testInstance.root.findByType(View).props.style;

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(value));
    });
  });

  it('should ignore all css unsupported values', () => {
    RN_UNSUPPORTED_VALUES.forEach(value => {
      const Box = styled.View`
        width: ${value};
        height: 30px;
      `;
      const testInstance = TestRenderer.create(<Box />);
      const styleProp = testInstance.root.findByType(View).props.style;

      expect(styleProp.width).toBeUndefined();
    });
  });

  it('should still apply css supported values', () => {
    RN_UNSUPPORTED_VALUES.forEach(value => {
      const Box = styled.View`
        width: ${value};
        height: 40px;
      `;
      const testInstance = TestRenderer.create(<Box />);
      const styleProp = testInstance.root.findByType(View).props.style;

      expect(styleProp.height).toBe(40);
    });
  });

  describe('attrs', () => {
    beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));

    it('works fine with an empty object', () => {
      const Comp = styled.View.attrs(() => ({}))``;
      const wrapper = TestRenderer.create(<Comp />);
      const view = wrapper.root.findByType(View);

      expect(view.props).toEqual({
        style: {},
      });
    });

    interface TestProps {
      first?: string;
      second?: string;
      test?: string | boolean;
      copy?: string;
    }

    const ComponentWithProps = styled.View<TestProps>``;

    it('passes simple props on', () => {
      const Comp = styled(ComponentWithProps).attrs(() => ({
        test: true,
      }))``;

      const wrapper = TestRenderer.create(<Comp />);
      const view = wrapper.root.findByType(View);

      expect(view.props).toEqual({
        style: {},
        test: true,
      });
    });

    it('calls an attr-function with context', () => {
      const Comp = styled(ComponentWithProps).attrs<{ copy?: string; test: string }>(p => ({
        copy: p.test,
      }))``;

      const test = 'Put that cookie down!';
      const wrapper = TestRenderer.create(<Comp test={test} />);
      const view = wrapper.root.findByType(View);

      expect(view.props).toEqual({
        style: {},
        copy: test,
        test,
      });
    });

    it('merges multiple calls', () => {
      const Comp = styled(ComponentWithProps)
        .attrs(() => ({
          first: 'first',
          test: '_',
        }))
        .attrs(() => ({
          second: 'second',
          test: 'test',
        }))``;

      const wrapper = TestRenderer.create(<Comp />);
      const view = wrapper.root.findByType(View);

      expect(view.props).toEqual({
        style: {},
        first: 'first',
        second: 'second',
        test: 'test',
      });
    });

    it('merges multiple fn calls', () => {
      const ComponentWithProps = styled.View<TestProps>``;

      const Comp = styled(ComponentWithProps)
        .attrs(() => ({
          first: 'first',
          test: '_',
        }))
        .attrs(() => ({
          second: 'second',
          test: 'test',
        }))``;

      const wrapper = TestRenderer.create(<Comp />);
      const view = wrapper.root.findByType(View);

      expect(view.props).toEqual({
        style: {},
        first: 'first',
        second: 'second',
        test: 'test',
      });
    });

    it('merges attrs when inheriting SC', () => {
      const Parent = styled(ComponentWithProps).attrs(() => ({
        first: 'first',
      }))``;

      const Child = styled(Parent).attrs(() => ({
        second: 'second',
      }))``;

      const wrapper = TestRenderer.create(<Child />);
      const view = wrapper.root.findByType(View);

      expect(view.props).toMatchObject({
        style: {},
        first: 'first',
        second: 'second',
      });
    });

    it('should pass through children as a normal prop', () => {
      const Comp = styled.Text.attrs(() => ({
        children: 'Probably a bad idea',
      }))``;

      const wrapper = TestRenderer.create(<Comp />);
      const text = wrapper.root.findByType(Text);

      expect(text.props).toMatchObject({
        children: 'Probably a bad idea',
        style: {},
      });
    });

    it('should pass through complex children as well', () => {
      const child = <Text>Probably a bad idea</Text>;
      const Comp = styled.Text.attrs(() => ({
        children: child,
      }))``;

      const wrapper = TestRenderer.create(<Comp />);
      const text = wrapper.root.findByType(Text);

      expect(text.props).toMatchObject({
        children: child,
        style: {},
      });
    });

    it('should override children', () => {
      const child = <Text>Amazing</Text>;
      const Comp = styled.Text.attrs(() => ({
        children: child,
      }))``;

      const wrapper = TestRenderer.create(<Comp>Something else</Comp>);
      const text = wrapper.root.findByType(Text);

      expect(text.props).toMatchObject({
        children: child,
        style: {},
      });
    });

    it('accepts a function', () => {
      const child = <Text>Amazing</Text>;
      const Comp = styled.Text.attrs(() => ({
        children: child,
      }))``;

      const wrapper = TestRenderer.create(<Comp>Something else</Comp>);
      const text = wrapper.root.findByType(Text);

      expect(text.props).toMatchObject({
        children: child,
        style: {},
      });
    });

    it('function form allows access to theme', () => {
      const Comp = styled.Text.attrs(props => ({
        selectionColor: props.theme.color,
      }))``;

      const wrapper = TestRenderer.create(
        <ThemeProvider theme={{ color: 'red' }}>
          <Comp>Something else</Comp>
        </ThemeProvider>
      );
      const text = wrapper.root.findByType(Text);

      expect(text.props).toMatchObject({
        children: 'Something else',
        selectionColor: 'red',
        style: {},
      });
    });

    it('preserves explicitly passed undefined props', () => {
      // Mirrors the web behavior (PR #5683): `<Comp prop={undefined} />` opts
      // out of an attrs-provided default rather than forwarding the default.
      const Comp = styled.View.attrs<{ accessible?: boolean }>({
        accessible: true,
      })``;

      const withDefault = TestRenderer.create(<Comp />);
      const viewDefault = withDefault.root.findByType(View);
      expect(viewDefault.props.accessible).toBe(true);

      const withUndefined = TestRenderer.create(<Comp accessible={undefined} />);
      const viewUndefined = withUndefined.root.findByType(View);
      expect(viewUndefined.props.accessible).toBe(undefined);
    });

    it('theme prop works', () => {
      const Comp = styled.Text`
        color: ${({ theme }) => theme.myColor};
      `;

      const wrapper = TestRenderer.create(<Comp theme={{ myColor: 'red' }}>Something else</Comp>);
      const text = wrapper.root.findByType(Text);

      expect(text.props.style).toMatchObject({ color: 'red' });
    });

    it('theme flows via ThemeProvider', () => {
      const Comp = styled.Text`
        color: ${({ theme }) => theme.myColor};
      `;

      const wrapper = TestRenderer.create(
        <ThemeProvider theme={{ myColor: 'red' }}>
          <Comp>Something else</Comp>
        </ThemeProvider>
      );
      const text = wrapper.root.findByType(Text);

      expect(text.props.style).toMatchObject({ color: 'red' });
    });

    it('convert css to styleSheet', () => {
      const cssStyle = css`
        background-color: red;
        border-width: 10px;
      `;

      expect(toStyleSheet(cssStyle)).toEqual({ backgroundColor: 'red', borderWidth: 10 });
    });

    describe('post-compile (arity-2 ast)', () => {
      it('lifts a declared style value into a prop via ast.pop and removes it from the style', () => {
        const Comp = styled.View.attrs<{ fill?: string }>((_props, ast) => ({
          fill: ast.pop('color'),
        }))`
          color: red;
          padding: 5px;
        `;

        const wrapper = TestRenderer.create(<Comp />);
        const view = wrapper.root.findByType(View);

        expect(view.props.fill).toBe('red');
        expect(view.props.style).toEqual({ padding: 5 });
      });

      it('reads without removing via ast.peek', () => {
        const Comp = styled.View.attrs<{ tint?: string }>((_props, ast) => ({
          tint: ast.peek('color'),
        }))`
          color: blue;
        `;

        const wrapper = TestRenderer.create(<Comp />);
        const view = wrapper.root.findByType(View);

        expect(view.props.tint).toBe('blue');
        expect(view.props.style).toEqual({ color: 'blue' });
      });

      it('does not mutate the cached compiled.base across renders', () => {
        const Comp = styled.View.attrs<{ fill?: string }>((_props, ast) => ({
          fill: ast.pop('color'),
        }))`
          color: green;
        `;

        const wrapper = TestRenderer.create(<Comp />);
        const first = wrapper.root.findByType(View);
        expect(first.props.fill).toBe('green');
        expect(first.props.style).toEqual({});

        wrapper.update(<Comp />);
        const second = wrapper.root.findByType(View);
        expect(second.props.fill).toBe('green');
        expect(second.props.style).toEqual({});
      });

      it('arity-1 attrs continue to flow through the legacy path', () => {
        const Comp = styled.View.attrs<{ accessibilityLabel?: string }>(() => ({
          accessibilityLabel: 'tagged',
        }))`
          color: orange;
        `;

        const wrapper = TestRenderer.create(<Comp />);
        const view = wrapper.root.findByType(View);

        expect(view.props.accessibilityLabel).toBe('tagged');
        expect(view.props.style).toEqual({ color: 'orange' });
      });

      it('explicit undefined prop wins over post-compile attrs', () => {
        const Comp = styled.View.attrs<{ fill?: string }>((_props, ast) => ({
          fill: ast.pop('color'),
        }))`
          color: red;
        `;

        const wrapper = TestRenderer.create(<Comp fill={undefined} />);
        const view = wrapper.root.findByType(View);

        // The user passed `fill={undefined}` to opt out of the attrs default;
        // post-compile attrs honor the same convention as arity-1 attrs.
        expect(view.props.fill).toBeUndefined();
        // Pop still removed the decl, so color is gone from style as well.
        expect(view.props.style).toEqual({});
      });

      it('static decl + static callback: callback is not invoked at render time', () => {
        const cb = jest.fn((_p: any, ast: any) => ({
          fill: ast.pop('color'),
        }));
        const Comp = styled.View.attrs<{ fill?: string }>(cb)`
          color: red;
        `;
        // Construction-time trace called the callback once. Clear, then
        // assert subsequent renders do NOT invoke it;the plan supplies
        // the output and the pop side effect without running user code.
        cb.mockClear();
        const wrapper = TestRenderer.create(<Comp />);
        wrapper.update(<Comp />);
        wrapper.update(<Comp />);
        expect(cb).not.toHaveBeenCalled();
        const view = wrapper.root.findByType(View);
        expect(view.props.fill).toBe('red');
        expect(view.props.style).toEqual({});
      });

      it('pop with a dotted path resolves a value from the active theme', () => {
        const Comp = styled.View.attrs<{ tint?: string }>((_p, ast) => ({
          tint: ast.pop('palette.brand'),
        }))``;
        const wrapper = TestRenderer.create(
          <ThemeProvider theme={{ palette: { brand: 'magenta' } }}>
            <Comp />
          </ThemeProvider>
        );
        const view = wrapper.root.findByType(View);
        expect(view.props.tint).toBe('magenta');
      });

      it('peek with a dotted path also reads from the theme', () => {
        const Comp = styled.View.attrs<{ tint?: string }>((_p, ast) => ({
          tint: ast.peek('palette.brand'),
        }))``;
        const wrapper = TestRenderer.create(
          <ThemeProvider theme={{ palette: { brand: 'cyan' } }}>
            <Comp />
          </ThemeProvider>
        );
        const view = wrapper.root.findByType(View);
        expect(view.props.tint).toBe('cyan');
      });

      it('templated decl falls back to per-render invocation', () => {
        const cb = jest.fn((_p: any, ast: any) => ({
          fill: ast.pop('color'),
        }));
        const Comp = styled.View.attrs<{ fill?: string }>(cb)`
          color: ${({ theme }: { theme: { c: string } }) => theme.c};
        `;
        cb.mockClear();
        TestRenderer.create(
          <ThemeProvider theme={{ c: 'cyan' }}>
            <Comp />
          </ThemeProvider>
        );
        expect(cb).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('expanded API', () => {
    it('should attach a displayName', () => {
      const Dummy = (props: PropsWithChildren<{}>) => <View {...props} />;
      Dummy.displayName = 'Dummy';

      const Comp = styled(Dummy)``;

      expect(Comp.displayName).toBe('Styled(Dummy)');

      const CompTwo = styled.View.withConfig({ displayName: 'Test' })``;
      expect(CompTwo.displayName).toBe('Test');
    });

    it('should allow multiple calls to be chained', () => {
      const Comp = styled.View.withConfig({ displayName: 'Test1' }).withConfig({
        displayName: 'Test2',
      })``;

      expect(Comp.displayName).toBe('Test2');
    });

    it('"as" prop should change the rendered element without affecting the styling', () => {
      // @ts-expect-error foo is expected later in the test
      const OtherText = (props: PropsWithChildren<{}>) => <Text {...props} foo />;

      const Comp = styled.Text`
        color: red;
      `;

      const wrapper = TestRenderer.create(<Comp as={OtherText} />);
      const view = wrapper.root.findByType(Text);

      expect(view.props).toHaveProperty('foo');
      expect(view.props.style).toEqual({ color: 'red' });
    });

    it('should omit transient props', () => {
      const Comp = styled.Text<{ $color: string }>`
        color: ${p => p.$color};
      `;

      expect(TestRenderer.create(<Comp $color="red" />).toJSON()).toMatchInlineSnapshot(`
        <Text
          style={
            {
              "color": "red",
            }
          }
        />
      `);
    });

    it('allows for custom prop filtering for elements', () => {
      const Comp = styled.View.withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop),
      })<{ filterThis: string; passThru: string }>`
        color: red;
      `;
      const wrapper = TestRenderer.create(<Comp filterThis="abc" passThru="def" />);
      // @ts-expect-error bs error
      const { props } = wrapper.root.findByType('View');
      expect(props.style).toEqual({ color: 'red' });
      expect(props.passThru).toBe('def');
      expect(props.filterThis).toBeUndefined();
    });

    it('allows custom prop filtering for components', () => {
      const InnerComp = (props: PropsWithChildren<{}>) => <View {...props} />;
      const Comp = styled(InnerComp).withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop),
      })<{ filterThis?: string; passThru?: string }>`
        color: red;
      `;
      const wrapper = TestRenderer.create(<Comp filterThis="abc" passThru="def" />);
      // @ts-expect-error bs error
      const { props } = wrapper.root.findByType('View');
      expect(props.style).toEqual({ color: 'red' });
      expect(props.passThru).toBe('def');
      expect(props.filterThis).toBeUndefined();
    });

    it('composes shouldForwardProp on composed styled components', () => {
      const StyledView = styled.View.withConfig({
        shouldForwardProp: prop => prop === 'passThru',
      })<{ filterThis?: boolean; passThru?: boolean }>`
        color: red;
      `;
      const ComposedView = styled(StyledView).withConfig({
        shouldForwardProp: () => true,
      })``;
      const wrapper = TestRenderer.create(<ComposedView filterThis passThru />);
      const { props } = wrapper.root.findByType(View);
      expect(props.passThru).toBeDefined();
      expect(props.filterThis).toBeUndefined();
    });

    it('shouldForwardProp argument signature', () => {
      const stub = jest.fn(() => true);
      const StyledView = styled.View.withConfig({
        shouldForwardProp: stub,
      })<{ something: boolean }>`
        color: red;
      `;

      TestRenderer.create(<StyledView something />);

      expect(stub.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "something",
            [Function],
          ],
        ]
      `);

      // element being created
      // @ts-expect-error bad types
      expect(stub.mock.calls[0][1]).toEqual(View);
    });

    it('should filter out props when using "as" to a custom component', () => {
      const AsComp = (props: PropsWithChildren<{}>) => <View {...props} />;
      const Comp = styled.View.withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop),
      })<{ filterThis: string; passThru: string }>`
        color: red;
      `;
      const wrapper = TestRenderer.create(<Comp as={AsComp} filterThis="abc" passThru="def" />);
      const { props } = wrapper.root.findByType(AsComp);

      expect(props.style).toEqual({ color: 'red' });
      expect(props.passThru).toBe('def');
      expect(props.filterThis).toBeUndefined();
    });

    it('can set computed styles based on props that are being filtered out', () => {
      const AsComp = (props: PropsWithChildren<{}>) => <View {...props} />;
      const Comp = styled.View.withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop),
      })<{ filterThis: string; passThru: string }>`
        color: ${props => (props.filterThis === 'abc' ? 'red' : undefined)};
      `;
      const wrapper = TestRenderer.create(<Comp as={AsComp} filterThis="abc" passThru="def" />);
      const { props } = wrapper.root.findByType(AsComp);

      expect(props.style).toEqual({ color: 'red' });
      expect(props.passThru).toBe('def');
      expect(props.filterThis).toBeUndefined();
    });

    it('should filter our props when using "as" to a different element', () => {
      const Comp = styled.View.withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop),
      })<{ filterThis: string; passThru: string }>`
        color: red;
      `;
      const wrapper = TestRenderer.create(<Comp as={Text} filterThis="abc" passThru="def" />);
      const { props } = wrapper.root.findByType(Text);

      expect(props.style).toEqual({ color: 'red' });
      expect(props.passThru).toBe('def');
      expect(props.filterThis).toBeUndefined();
    });
  });

  describe('static render impl', () => {
    it('flags fully-static CSS as static-eligible', () => {
      const Comp = styled.View`
        color: red;
        padding-top: 10px;
      `;
      expect(Comp.nativeStyle.staticEligible).toBe(true);
    });

    it('static CSS with attrs is still static-eligible at the CSS level', () => {
      const Comp = styled.View.attrs({ testID: 'x' })`
        color: red;
      `;
      // The flag is CSS-level only. The factory layer additionally requires
      // empty attrs + no shouldForwardProp before routing to useStaticImpl.
      expect(Comp.nativeStyle.staticEligible).toBe(true);
    });

    it('function-interpolated CSS is not static-eligible (no precomputed compile)', () => {
      const Comp = styled.View<{ $color: string }>`
        color: ${p => p.$color};
      `;
      expect(Comp.nativeStyle.staticEligible).toBe(false);
    });

    it('function-interpolated CSS with @media conditionals is not static-eligible', () => {
      const Comp = styled.View<{ $color: string }>`
        color: ${p => p.$color};
        @media (min-width: 500px) {
          padding: 8px;
        }
      `;
      expect(Comp.nativeStyle.staticEligible).toBe(false);
    });

    it('function-interpolated CSS with pseudo states is not static-eligible', () => {
      const Comp = styled.View<{ $color: string }>`
        color: ${p => p.$color};
        &:hover {
          opacity: 0.5;
        }
      `;
      expect(Comp.nativeStyle.staticEligible).toBe(false);
    });

    it('function-interpolated CSS with viewport units is not static-eligible', () => {
      const Comp = styled.View<{ $w: number }>`
        width: ${p => p.$w}px;
        height: 50vh;
      `;
      expect(Comp.nativeStyle.staticEligible).toBe(false);
    });

    it('flags CSS with @media conditionals as not static-eligible', () => {
      const Comp = styled.View`
        color: red;
        @media (min-width: 500px) {
          color: blue;
        }
      `;
      expect(Comp.nativeStyle.staticEligible).toBe(false);
    });

    it('flags CSS with pseudo states as not static-eligible', () => {
      const Comp = styled.View`
        color: red;
        &:hover {
          color: blue;
        }
      `;
      expect(Comp.nativeStyle.staticEligible).toBe(false);
    });

    it('static path renders with style + as + ref', () => {
      const Comp = styled.View`
        padding-top: 10px;
      `;
      const ref = React.createRef<any>();
      const userStyle = { opacity: 0.5 };
      const wrapper = TestRenderer.create(<Comp ref={ref} style={userStyle} />);
      const view = wrapper.root.findByType(View);
      expect(view.props.style).toEqual([{ paddingTop: 10 }, userStyle]);
    });

    it('static path supports as= override', () => {
      const Comp = styled.View`
        padding-top: 10px;
      `;
      const wrapper = TestRenderer.create(<Comp as={Text} />);
      const text = wrapper.root.findByType(Text);
      expect(text.props.style).toEqual({ paddingTop: 10 });
    });

    it('static path supports function style (Pressable state callback)', () => {
      const Comp = styled.View`
        padding-top: 10px;
      `;
      const userStyle = (state: { pressed?: boolean }) =>
        state.pressed ? { opacity: 0.5 } : { opacity: 1 };
      const wrapper = TestRenderer.create(<Comp style={userStyle} />);
      const view = wrapper.root.findByType(View);
      const composed = view.props.style({ pressed: true });
      expect(composed).toEqual([{ paddingTop: 10 }, { opacity: 0.5 }]);
    });

    it('extending a static component with dynamic CSS routes through the dynamic impl', () => {
      const Base = styled.View`
        padding-top: 10px;
      `;
      expect(Base.nativeStyle.staticEligible).toBe(true);
      const Extended = styled(Base)<{ $color: string }>`
        color: ${p => p.$color};
      `;
      // Function interpolation drops staticCompiled, so the extension can't
      // use the static path. The dynamic impl picks up the full output.
      expect(Extended.nativeStyle.staticEligible).toBe(false);
      const wrapper = TestRenderer.create(<Extended $color="red" />);
      const view = wrapper.root.findByType(View);
      expect(view.props.style).toEqual({ paddingTop: 10, color: 'red' });
    });

    it('extending with responsive CSS keeps the dynamic impl active', () => {
      const Base = styled.View`
        padding-top: 10px;
      `;
      expect(Base.nativeStyle.staticEligible).toBe(true);
      const Extended = styled(Base)`
        @media (min-width: 500px) {
          color: blue;
        }
      `;
      expect(Extended.nativeStyle.staticEligible).toBe(false);
    });

    it('dynamic-rule CSS containing env() is not static-eligible (resolver pass needed)', () => {
      const Comp = styled.View<{ $color: string }>`
        color: ${p => p.$color};
        padding-top: env(safe-area-inset-top);
      `;
      expect(Comp.nativeStyle.staticEligible).toBe(false);
    });

    it('dynamic-rule CSS containing a createTheme sentinel is not static-eligible', () => {
      const Comp = styled.View<{ $w: number }>`
        width: ${p => p.$w}px;
        color: \0sc:colors.bg:#fff;
      `;
      expect(Comp.nativeStyle.staticEligible).toBe(false);
    });
  });

  describe('HMR memo invalidation (dev injector)', () => {
    // Without the injector, `React.memo` bails out when the user-props
    // bag is shallow-equal across renders. After HMR, a new `NativeStyle`
    // instance is attached to the same styled component (React Refresh
    // swaps the closure in place); the bail-out then keeps the old
    // compiled CSS on screen. The dev-only injector adds a `$$nativeStyle`
    // sentinel into the memo'd props so the reference change forces a
    // re-render and the new style takes effect on the next paint.

    it('re-renders when nativeStyle is swapped on a static component', () => {
      const Comp = styled.View`
        padding-top: 10px;
      `;
      const NewComp = styled.View`
        padding-top: 99px;
      `;
      const wrapper = TestRenderer.create(<Comp />);
      expect(wrapper.root.findByType(View).props.style).toEqual({ paddingTop: 10 });

      // Simulate HMR's effect on the styled-component instance.
      (Comp as any).nativeStyle = NewComp.nativeStyle;
      wrapper.update(<Comp />);

      expect(wrapper.root.findByType(View).props.style).toEqual({ paddingTop: 99 });
    });

    it('re-renders when nativeStyle is swapped on a dynamic component', () => {
      const Comp = styled.View<{ $color: string }>`
        color: ${p => p.$color};
      `;
      const NewComp = styled.View<{ $color: string }>`
        color: ${p => p.$color};
        padding-top: 42px;
      `;
      const wrapper = TestRenderer.create(<Comp $color="red" />);
      expect(wrapper.root.findByType(View).props.style).toEqual({ color: 'red' });

      (Comp as any).nativeStyle = NewComp.nativeStyle;
      wrapper.update(<Comp $color="red" />);

      expect(wrapper.root.findByType(View).props.style).toEqual({
        color: 'red',
        paddingTop: 42,
      });
    });

    it('does not forward $$nativeStyle onto the rendered element', () => {
      const Comp = styled.View`
        padding-top: 10px;
      `;
      const wrapper = TestRenderer.create(<Comp />);
      const view = wrapper.root.findByType(View);
      // Transient (`$`-prefixed) props are filtered by buildPropsForElement.
      expect(view.props.$$nativeStyle).toBeUndefined();
    });
  });

  describe('line-clamp polyfill', () => {
    beforeEach(() => {
      resetStyleCache();
    });

    it('lifts line-clamp to numberOfLines on a styled Text', () => {
      const Clamped = styled.Text`
        line-clamp: 2;
      `;
      const tree = TestRenderer.create(<Clamped>long text</Clamped>);
      const text = tree.root.findByType(Text);
      expect(text.props.numberOfLines).toBe(2);
      const flat = ([] as any[])
        .concat(text.props.style ?? [])
        .flat(Infinity)
        .filter(Boolean);
      expect(flat).toContainEqual({ overflow: 'hidden' });
      for (const entry of flat) expect(entry.numberOfLines).toBeUndefined();
    });

    it('lifts line-clamp on a doubly-wrapped Text (deep target detection)', () => {
      const InnerText = styled.Text``;
      const Clamped = styled(InnerText)`
        line-clamp: 3;
      `;
      const warnSpy2 = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const tree = TestRenderer.create(<Clamped>long text</Clamped>);
        const text = tree.root.findByType(Text);
        expect(text.props.numberOfLines).toBe(3);
        expect(warnSpy2).not.toHaveBeenCalled();
      } finally {
        warnSpy2.mockRestore();
      }
    });

    it('lifts line-clamp to numberOfLines on a styled TextInput', () => {
      const Clamped = styled.TextInput`
        line-clamp: 1;
      `;
      const tree = TestRenderer.create(<Clamped value="x" onChangeText={() => {}} />);
      const input = tree.root.findByType(TextInput);
      expect(input.props.numberOfLines).toBe(1);
    });

    it('user numberOfLines prop wins over compiled line-clamp', () => {
      const Clamped = styled.Text`
        line-clamp: 2;
      `;
      const tree = TestRenderer.create(<Clamped numberOfLines={5}>x</Clamped>);
      const text = tree.root.findByType(Text);
      expect(text.props.numberOfLines).toBe(5);
    });

    it('warns once when line-clamp is applied to a non-Text element', () => {
      const warnSpy2 = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const Bad = styled.View`
          line-clamp: 2;
        `;
        const tree = TestRenderer.create(<Bad />);
        tree.update(<Bad />);
        const view = tree.root.findByType(View);
        expect(view.props.numberOfLines).toBe(2);
        expect(warnSpy2).toHaveBeenCalledTimes(1);
        const message = warnSpy2.mock.calls[0][0] as string;
        expect(message).toContain('line-clamp');
        expect(message).toContain('<Text>');
        expect(message).toContain('<View>');
      } finally {
        warnSpy2.mockRestore();
      }
    });

    it('warns at compile time when line-clamp is nested inside @media', () => {
      const warnSpy2 = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const Comp = styled.Text`
          color: red;
          @media (min-width: 500px) {
            line-clamp: 2;
          }
        `;
        const tree = TestRenderer.create(<Comp>x</Comp>);
        const text = tree.root.findByType(Text);
        expect(text.props.numberOfLines).toBeUndefined();
        const conditionalWarning = warnSpy2.mock.calls.find(
          call => typeof call[0] === 'string' && call[0].includes('@media')
        );
        expect(conditionalWarning).toBeDefined();
        expect(conditionalWarning![0]).toContain('line-clamp');
        expect(conditionalWarning![0]).toContain('top level');
      } finally {
        warnSpy2.mockRestore();
      }
    });

    it('does not include numberOfLines in the registered StyleSheet entry', () => {
      const Comp = styled.Text`
        color: red;
        line-clamp: 2;
      `;
      const tree = TestRenderer.create(<Comp>x</Comp>);
      const text = tree.root.findByType(Text);
      const flat = ([] as any[])
        .concat(text.props.style ?? [])
        .flat(Infinity)
        .filter(Boolean);
      for (const entry of flat) {
        expect(entry.numberOfLines).toBeUndefined();
      }
    });
  });
});
