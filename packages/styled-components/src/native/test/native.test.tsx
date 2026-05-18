import React, { PropsWithChildren } from 'react';
import { Image, Text, TextInput, View, ViewProps } from 'react-native';
import TestRenderer from 'react-test-renderer';
import styled, { ThemeProvider, css, toStyleSheet } from '../';
import { resetStyleCache, RN_UNSUPPORTED_VALUES } from '../../models/NativeStyle';
import { describeOnRnWeb } from '../transform/describeOnRnWeb';

// NOTE: These tests are like the ones for Web but a "light-version" of them
// This is mostly due to the similar logic

function flattenStyle(style: unknown): Array<Record<string, any>> {
  return [style].flat(Infinity).filter(Boolean) as Array<Record<string, any>>;
}

function mergeStyle(style: unknown): Record<string, any> {
  return Object.assign({}, ...flattenStyle(style));
}

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

      // Recipe: route `accent-color` onto an arbitrary tint prop of a wrapped
      // third-party component. The accent-color polyfill keeps the resolved
      // value in `accentColor` alongside the Switch trackColor lift, so
      // ast.pop('accentColor') folds straight into whatever prop the wrapped
      // component reads (Slider thumbTintColor, Checkbox color, ...).
      it('attrs routes accent-color to a custom prop on a wrapped component', () => {
        const Slider = (props: { thumbTintColor?: string }) => <View {...(props as object)} />;
        Slider.displayName = 'Slider';
        const ThemedSlider = styled(Slider).attrs<{ thumbTintColor?: string }>((_p, ast) => ({
          thumbTintColor: ast.pop('accentColor'),
        }))`
          accent-color: red;
        `;
        const wrapper = TestRenderer.create(<ThemedSlider />);
        const slider = wrapper.root.findByType(Slider);
        expect(slider.props.thumbTintColor).toBe('red');
        expect(slider.props.style).not.toHaveProperty('accentColor');
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

    // Cascade-publishing properties must route to useDynamicImpl so a
    // fresh NativeStyleContext value reaches descendants. Without the
    // disqualification a child `1em` would resolve against the
    // inherited base font-size, not this component's override.
    it('font-size declaration disqualifies static eligibility', () => {
      const Comp = styled.View`
        font-size: 24px;
      `;
      expect(Comp.nativeStyle.staticEligible).toBe(false);
    });

    it('line-height declaration disqualifies static eligibility', () => {
      const Comp = styled.View`
        line-height: 32px;
      `;
      expect(Comp.nativeStyle.staticEligible).toBe(false);
    });

    it('direction declaration disqualifies static eligibility', () => {
      const Comp = styled.View`
        direction: rtl;
      `;
      expect(Comp.nativeStyle.staticEligible).toBe(false);
    });

    // Regression: a parent declaring `font-size: 24px` must publish a
    // fresh cascade so a child's `font-size: 1em` resolves to 24, not
    // the inherited default of 16.
    it('font-size publishes to descendants resolving 1em', () => {
      const Parent = styled.View`
        font-size: 24px;
      `;
      const Child = styled.Text`
        font-size: 1em;
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Child>hi</Child>
        </Parent>
      );
      const text = tree.root.findByType(Text);
      const merged = mergeStyle(text.props.style);
      expect(merged.fontSize).toBe(24);
    });

    it('line-height publishes to descendants resolving 1lh', () => {
      const Parent = styled.View`
        line-height: 32px;
      `;
      const Child = styled.Text`
        height: 1lh;
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Child>hi</Child>
        </Parent>
      );
      const text = tree.root.findByType(Text);
      const merged = mergeStyle(text.props.style);
      expect(merged.height).toBe(32);
    });

    // Cascade-publish via a conditional bucket: when a parent declares
    // `font-size` inside an `@media` block that matches at render time,
    // descendants resolving `1em` must pick up the active value. This
    // exercises the case where the cascade-publishing decl lives in the
    // resolved style array (not the base object), so the compile-time
    // publish flag must consider conditional buckets too.
    it('font-size declared inside @media publishes to descendants when matched', () => {
      // The default jsdom-test window is 1024x768 so this @media matches.
      const Parent = styled.View`
        font-size: 12px;
        @media (min-width: 100px) {
          font-size: 24px;
        }
      `;
      const Child = styled.Text`
        font-size: 1em;
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Child>hi</Child>
        </Parent>
      );
      const text = tree.root.findByType(Text);
      const merged = mergeStyle(text.props.style);
      expect(merged.fontSize).toBe(24);
    });

    // Cascade-publish via a resolver: a font-size value that has to
    // resolve at render time (theme sentinel, viewport unit, env(),
    // light-dark()) still publishes. The flag must consider compiled
    // resolvers, not only the static base.
    it('font-size that lives in resolvers publishes to descendants', () => {
      const Parent = styled.View`
        font-size: 2rem;
      `;
      const Child = styled.Text`
        font-size: 1em;
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Child>hi</Child>
        </Parent>
      );
      const text = tree.root.findByType(Text);
      const merged = mergeStyle(text.props.style);
      // 2rem against the default 16px root font-size = 32.
      expect(merged.fontSize).toBe(32);
    });

    // The cascade is derived from the assembled style (which includes
    // user style), not the compiled output alone, so a user-supplied
    // fontSize on a dynamic parent must still publish even when the
    // parent's CSS declares no cascade keys.
    it('user-supplied fontSize on a dynamic parent with no compiled cascade publishes to descendants', () => {
      const Parent = styled.View<{ $tag: string }>`
        padding: ${p => p.$tag};
      `;
      expect(Parent.nativeStyle.staticEligible).toBe(false);
      const Child = styled.Text`
        font-size: 1em;
      `;
      const tree = TestRenderer.create(
        <Parent $tag="4px" style={{ fontSize: 40 }}>
          <Child>hi</Child>
        </Parent>
      );
      const text = tree.root.findByType(Text);
      const merged = mergeStyle(text.props.style);
      expect(merged.fontSize).toBe(40);
    });

    // A dynamic-eligible component (forced via function interpolation)
    // that has no cascade keys must still pass the inherited cascade
    // through unchanged: descendants resolving `1em` see the value from
    // an ancestor that DOES publish, not the default 16.
    it('dynamic component without cascade keys passes inherited cascade through', () => {
      const Outer = styled.View`
        font-size: 24px;
      `;
      // Force dynamic with a function interpolation.
      const Middle = styled.View<{ $tag: string }>`
        padding: ${p => p.$tag};
      `;
      const Child = styled.Text`
        font-size: 1em;
      `;
      const tree = TestRenderer.create(
        <Outer>
          <Middle $tag="4px">
            <Child>hi</Child>
          </Middle>
        </Outer>
      );
      const text = tree.root.findByType(Text);
      const merged = mergeStyle(text.props.style);
      expect(merged.fontSize).toBe(24);
    });
  });

  describe('ParentContext value memoization', () => {
    // Without memoization, every parent re-render allocates a fresh
    // `ParentContextValue` object and per-child Provider value. That
    // change-by-reference defeats `React.memo` on every styled
    // descendant: their effective context value flips each render, so
    // React re-runs them even when their own props are equal. The
    // memoization caches both the published value and the indexed
    // children across renders with stable inputs.
    it('publishes a reference-stable ParentContext value across re-renders', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ParentContext } = require('../ParentContext');
      const seen: unknown[] = [];
      function ContextSpy() {
        const v = React.useContext(ParentContext);
        seen.push(v);
        return null;
      }
      const Parent = styled.View.withConfig({ displayName: 'MemoParent' })`
        padding-top: 4px;
      `;
      const tree = TestRenderer.create(
        <Parent>
          <ContextSpy />
        </Parent>
      );
      // Force a re-render with a different prop reference; the inherited
      // ParentContext above Parent is unchanged, so the published value
      // should stay reference-stable.
      tree.update(
        <Parent testID="rerender">
          <ContextSpy />
        </Parent>
      );
      expect(seen.length).toBeGreaterThanOrEqual(2);
      const first = seen[0] as { parentId?: string } | undefined;
      const last = seen[seen.length - 1];
      expect(first?.parentId).toBe(Parent.styledComponentId);
      expect(last).toBe(first);
    });

    it('per-child Provider values stay reference-stable when children are unchanged', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ParentContext } = require('../ParentContext');
      const seenByName: Record<string, unknown[]> = {};
      function ContextSpy({ name }: { name: string }) {
        const v = React.useContext(ParentContext);
        (seenByName[name] = seenByName[name] || []).push(v);
        return null;
      }
      const Parent = styled.View.withConfig({ displayName: 'MemoParentSib' })`
        padding-top: 4px;
      `;
      const Child = styled.View.withConfig({ displayName: 'MemoChildSib' })`
        color: red;
      `;
      const renderWith = (extra: ViewProps = {}) => (
        <Parent {...extra}>
          <Child>
            <ContextSpy name="a" />
          </Child>
          <Child>
            <ContextSpy name="b" />
          </Child>
        </Parent>
      );
      const tree = TestRenderer.create(renderWith());
      tree.update(renderWith({ testID: 'rerender' }));
      // Each ContextSpy sees its enclosing styled Child as the parent.
      // With memoization the per-child value matches across the two
      // renders for both siblings.
      expect(seenByName.a.length).toBeGreaterThanOrEqual(2);
      expect(seenByName.b.length).toBeGreaterThanOrEqual(2);
      expect(seenByName.a[seenByName.a.length - 1]).toBe(seenByName.a[0]);
      expect(seenByName.b[seenByName.b.length - 1]).toBe(seenByName.b[0]);
    });
  });

  // Locks the user-style composition contract on both the static and
  // dynamic paths, including auto-`container-name` injection when CSS
  // declares `container-type` without an explicit name.
  describe('style composition', () => {
    describe('static path (useStaticImpl)', () => {
      it('returns the compiled base as a plain object when no user style is supplied', () => {
        const Comp = styled.View`
          padding-top: 10px;
        `;
        expect(Comp.nativeStyle.staticEligible).toBe(true);
        const wrapper = TestRenderer.create(<Comp />);
        const view = wrapper.root.findByType(View);
        expect(view.props.style).toEqual({ paddingTop: 10 });
      });

      it('wraps base + object user style as [base, user]', () => {
        const Comp = styled.View`
          padding-top: 10px;
        `;
        const userStyle = { opacity: 0.5 };
        const wrapper = TestRenderer.create(<Comp style={userStyle} />);
        const view = wrapper.root.findByType(View);
        expect(view.props.style).toEqual([{ paddingTop: 10 }, userStyle]);
      });

      it('flattens base + array user style as [base, ...user]', () => {
        const Comp = styled.View`
          padding-top: 10px;
        `;
        const userStyle = [{ opacity: 0.5 }, { margin: 4 }];
        const wrapper = TestRenderer.create(<Comp style={userStyle} />);
        const view = wrapper.root.findByType(View);
        expect(view.props.style).toEqual([{ paddingTop: 10 }, { opacity: 0.5 }, { margin: 4 }]);
      });

      it('passes through base unchanged when user style is null', () => {
        const Comp = styled.View`
          padding-top: 10px;
        `;
        // @ts-expect-error: testing runtime null handling
        const wrapper = TestRenderer.create(<Comp style={null} />);
        const view = wrapper.root.findByType(View);
        expect(view.props.style).toEqual({ paddingTop: 10 });
      });

      it('auto-injects containerName when container-type is declared without container-name', () => {
        const Card = styled.View.withConfig({ displayName: 'AutoNameCard' })`
          container-type: size;
        `;
        const wrapper = TestRenderer.create(<Card />);
        const view = wrapper.root.findByType(View);
        const merged = mergeStyle(view.props.style);
        expect(merged.containerName).toBe(Card.styledComponentId);
      });

      it('does NOT auto-inject containerName when container-name was supplied explicitly', () => {
        const Card = styled.View`
          container-type: size;
          container-name: explicit;
        `;
        const wrapper = TestRenderer.create(<Card />);
        const view = wrapper.root.findByType(View);
        const merged = mergeStyle(view.props.style);
        // The author-supplied name is what the runtime resolves to; the
        // styledComponentId never appears as a containerName injection.
        expect(merged.containerName).toBe('explicit');
      });

      it('auto-injects containerName alongside an object user style', () => {
        const Card = styled.View.withConfig({ displayName: 'AutoNameUserCard' })`
          container-type: size;
        `;
        const wrapper = TestRenderer.create(<Card style={{ opacity: 0.7 }} />);
        const view = wrapper.root.findByType(View);
        const merged = mergeStyle(view.props.style);
        expect(merged.opacity).toBe(0.7);
        expect(merged.containerName).toBe(Card.styledComponentId);
      });

      it('layers function-form user style as a state callback returning [base, callbackResult]', () => {
        const Comp = styled.View`
          padding-top: 10px;
        `;
        const userStyle = (state: { pressed?: boolean }) =>
          state.pressed ? { opacity: 0.5 } : { opacity: 1 };
        const wrapper = TestRenderer.create(<Comp style={userStyle} />);
        const view = wrapper.root.findByType(View);
        expect(typeof view.props.style).toBe('function');
        expect(view.props.style({ pressed: true })).toEqual([{ paddingTop: 10 }, { opacity: 0.5 }]);
        expect(view.props.style({ pressed: false })).toEqual([{ paddingTop: 10 }, { opacity: 1 }]);
      });

      it('layers function-form user style returning an array result', () => {
        const Comp = styled.View`
          padding-top: 10px;
        `;
        const userStyle = () => [{ opacity: 0.5 }, { margin: 4 }];
        const wrapper = TestRenderer.create(<Comp style={userStyle} />);
        const view = wrapper.root.findByType(View);
        expect(typeof view.props.style).toBe('function');
        expect(view.props.style({})).toEqual([{ paddingTop: 10 }, { opacity: 0.5 }, { margin: 4 }]);
      });

      it('layers auto-containerName ON TOP OF a function-form user style', () => {
        const Card = styled.View.withConfig({ displayName: 'AutoNameFnCard' })`
          container-type: size;
        `;
        const userStyle = (state: { pressed?: boolean }) =>
          state.pressed ? { opacity: 0.5 } : { opacity: 1 };
        const wrapper = TestRenderer.create(<Card style={userStyle} />);
        const view = wrapper.root.findByType(View);
        // Function form preserved; container name appended as a static layer
        // after the callback result.
        expect(typeof view.props.style).toBe('function');
        const result = view.props.style({ pressed: true });
        const merged = mergeStyle(result);
        expect(merged.opacity).toBe(0.5);
        expect(merged.containerName).toBe(Card.styledComponentId);
      });
    });

    describe('dynamic path (useDynamicImpl)', () => {
      // Force a dynamic path with a function interpolation; the cascade
      // and conditional code is then exercised but the user-style
      // composition contract is the same shape.
      it('composes base + object user style', () => {
        const Comp = styled.View<{ $color: string }>`
          color: ${p => p.$color};
          padding-top: 10px;
        `;
        expect(Comp.nativeStyle.staticEligible).toBe(false);
        const wrapper = TestRenderer.create(<Comp $color="red" style={{ opacity: 0.5 }} />);
        const view = wrapper.root.findByType(View);
        // Dynamic path returns merged-object form when there's no
        // active conditional; the structural contract is the same:
        // user style is layered after base.
        const merged = mergeStyle(view.props.style);
        expect(merged.color).toBe('red');
        expect(merged.paddingTop).toBe(10);
        expect(merged.opacity).toBe(0.5);
      });

      it('auto-injects containerName on the dynamic path', () => {
        const Card = styled.View.withConfig({ displayName: 'DynAutoNameCard' })<{ $w: number }>`
          width: ${p => p.$w}px;
          container-type: size;
        `;
        expect(Card.nativeStyle.staticEligible).toBe(false);
        const wrapper = TestRenderer.create(<Card $w={200} />);
        const view = wrapper.root.findByType(View);
        const merged = mergeStyle(view.props.style);
        expect(merged.containerName).toBe(Card.styledComponentId);
        expect(merged.width).toBe(200);
      });

      it('layers function-form user style with auto-container-name on the dynamic path', () => {
        const Card = styled.View.withConfig({ displayName: 'DynAutoNameFnCard' })<{ $w: number }>`
          width: ${p => p.$w}px;
          container-type: size;
        `;
        const userStyle = (state: { pressed?: boolean }) =>
          state.pressed ? { opacity: 0.5 } : { opacity: 1 };
        const wrapper = TestRenderer.create(<Card $w={200} style={userStyle} />);
        const view = wrapper.root.findByType(View);
        expect(typeof view.props.style).toBe('function');
        const result = view.props.style({ pressed: true });
        const merged = mergeStyle(result);
        expect(merged.opacity).toBe(0.5);
        expect(merged.containerName).toBe(Card.styledComponentId);
        expect(merged.width).toBe(200);
      });
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
      const flat = flattenStyle(text.props.style);
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
      const flat = flattenStyle(text.props.style);
      for (const entry of flat) {
        expect(entry.numberOfLines).toBeUndefined();
      }
    });
  });

  // CSS Text 4 §7.1 - text-align: start / end / match-parent.
  // RN's platform text engine flips left ↔ right when the inherited
  // paragraph direction is rtl, so the compile output is the same in both
  // directions; the visual flip happens in iOS RCTTextAttributes and
  // Android TextLayoutManager.
  describe('text-align: start / end / match-parent', () => {
    beforeEach(() => {
      resetStyleCache();
    });

    it('text-align: start compiles to textAlign: left under direction: ltr', () => {
      const Card = styled.View<{ $dir: 'ltr' | 'rtl' }>`
        direction: ${p => p.$dir};
      `;
      const Label = styled.Text`
        text-align: start;
      `;
      const tree = TestRenderer.create(
        <Card $dir="ltr">
          <Label>start edge</Label>
        </Card>
      );
      const merged = mergeStyle(tree.root.findByType(Text).props.style);
      expect(merged.textAlign).toBe('left');
    });

    it('text-align: start still compiles to textAlign: left under direction: rtl', () => {
      const Card = styled.View<{ $dir: 'ltr' | 'rtl' }>`
        direction: ${p => p.$dir};
      `;
      const Label = styled.Text`
        text-align: start;
      `;
      const tree = TestRenderer.create(
        <Card $dir="rtl">
          <Label>start edge</Label>
        </Card>
      );
      const merged = mergeStyle(tree.root.findByType(Text).props.style);
      // RN's platform layer flips left → right when the inherited
      // paragraph direction is rtl, so emitting `left` here is what
      // makes the visual start edge land in the right spot.
      expect(merged.textAlign).toBe('left');
    });

    it('text-align: end compiles to textAlign: right', () => {
      const Label = styled.Text`
        text-align: end;
      `;
      const tree = TestRenderer.create(<Label>end edge</Label>);
      const merged = mergeStyle(tree.root.findByType(Text).props.style);
      expect(merged.textAlign).toBe('right');
    });

    it('text-align: match-parent compiles to textAlign: left', () => {
      const Label = styled.Text`
        text-align: match-parent;
      `;
      const tree = TestRenderer.create(<Label>match</Label>);
      const merged = mergeStyle(tree.root.findByType(Text).props.style);
      expect(merged.textAlign).toBe('left');
    });
  });

  describe('hyphens lift', () => {
    beforeEach(() => {
      resetStyleCache();
    });

    it('lifts hyphens: auto to android_hyphenationFrequency: "normal" on Text', () => {
      const Hyph = styled.Text`
        hyphens: auto;
      `;
      const tree = TestRenderer.create(<Hyph>antidisestablishmentarianism</Hyph>);
      const text = tree.root.findByType(Text);
      expect(text.props.android_hyphenationFrequency).toBe('normal');
      const flat = flattenStyle(text.props.style);
      for (const entry of flat) expect(entry.android_hyphenationFrequency).toBeUndefined();
    });

    it('lifts hyphens: none to android_hyphenationFrequency: "none" on Text', () => {
      const Hyph = styled.Text`
        hyphens: none;
      `;
      const tree = TestRenderer.create(<Hyph>x</Hyph>);
      const text = tree.root.findByType(Text);
      expect(text.props.android_hyphenationFrequency).toBe('none');
    });

    it('lifts hyphens: manual to android_hyphenationFrequency: "none" on Text', () => {
      const Hyph = styled.Text`
        hyphens: manual;
      `;
      const tree = TestRenderer.create(<Hyph>x</Hyph>);
      const text = tree.root.findByType(Text);
      expect(text.props.android_hyphenationFrequency).toBe('none');
    });

    it('user android_hyphenationFrequency prop wins over compiled hyphens', () => {
      const Hyph = styled.Text`
        hyphens: auto;
      `;
      const tree = TestRenderer.create(
        // @ts-expect-error RN's prop typing for this is Android-only and not in the public Text props
        <Hyph android_hyphenationFrequency="full">x</Hyph>
      );
      const text = tree.root.findByType(Text);
      expect(text.props.android_hyphenationFrequency).toBe('full');
    });
  });

  // https://drafts.csswg.org/css-forms-1/#field-sizing
  describe('field-sizing lift (CSS Form Control Styling 1 §7.1)', () => {
    // RN's multiline TextInput grows on its own via Yoga's shadow-view
    // measure callback (`RCTBaseTextInputShadowView.sizeThatFits` returns
    // the natural text size with `maximumSize.height = CGFLOAT_MAX`).
    // The polyfill's job is just to flip `multiline: true` so the
    // measure callback engages.
    it('lifts multiline: true on a styled TextInput', () => {
      const Auto = styled.TextInput`
        field-sizing: content;
        min-height: 44px;
      `;
      const tree = TestRenderer.create(<Auto value="" onChangeText={() => {}} />);
      const input = tree.root.findByType(TextInput);
      expect(input.props.multiline).toBe(true);
    });

    it('does not inject height or onContentSizeChange (Yoga handles growth)', () => {
      const Auto = styled.TextInput`
        field-sizing: content;
        min-height: 44px;
      `;
      const tree = TestRenderer.create(<Auto value="" onChangeText={() => {}} />);
      const input = tree.root.findByType(TextInput);
      expect(input.props.onContentSizeChange).toBeUndefined();
      const merged = mergeStyle(input.props.style);
      expect(merged.height).toBeUndefined();
      expect(merged.minHeight).toBe(44);
    });

    it('user multiline={false} disables the lift and warns', () => {
      const warnSpy2 = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const Auto = styled.TextInput`
          field-sizing: content;
        `;
        const tree = TestRenderer.create(
          <Auto value="" onChangeText={() => {}} multiline={false} />
        );
        const input = tree.root.findByType(TextInput);
        expect(input.props.multiline).toBe(false);
        const message = warnSpy2.mock.calls.find(
          c => typeof c[0] === 'string' && c[0].includes('field-sizing')
        );
        expect(message).toBeDefined();
        expect(message![0]).toContain('multiline');
      } finally {
        warnSpy2.mockRestore();
      }
    });

    it('field-sizing: fixed is a no-op', () => {
      const Plain = styled.TextInput`
        field-sizing: fixed;
        height: 44px;
      `;
      const tree = TestRenderer.create(<Plain value="" onChangeText={() => {}} />);
      const input = tree.root.findByType(TextInput);
      expect(input.props.multiline).toBeUndefined();
    });
  });

  // https://drafts.csswg.org/css-ui-4/#interactivity
  describe('interactivity: inert priority (CSS UI 4 §6.3)', () => {
    let warnSpy: jest.SpyInstance;
    beforeEach(() => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    // Spec bullet 1: "Hit-testing must act as if `pointer-events` was
    // `none`, regardless of its actual value." Same "regardless of its
    // actual value" applies to focus / selection / editable.
    it('priority lifts win over author-supplied props', () => {
      const Locked = styled.View`
        interactivity: inert;
      `;
      const tree = TestRenderer.create(
        <Locked pointerEvents="auto" focusable={true} importantForAccessibility="yes" />
      );
      const root = tree.root.findByType(View);
      expect(root.props.pointerEvents).toBe('none');
      expect(root.props.focusable).toBe(false);
      expect(root.props.importantForAccessibility).toBe('no-hide-descendants');
      expect(root.props.accessibilityElementsHidden).toBe(true);
    });

    it('Text gets selectable={false} under inert', () => {
      const Locked = styled.Text`
        interactivity: inert;
      `;
      const tree = TestRenderer.create(<Locked selectable>frozen</Locked>);
      const text = tree.root.findByType(Text);
      expect(text.props.selectable).toBe(false);
    });

    it('TextInput gets editable={false} under inert', () => {
      const Locked = styled.TextInput`
        interactivity: inert;
      `;
      const tree = TestRenderer.create(<Locked value="" onChangeText={() => {}} editable={true} />);
      const input = tree.root.findByType(TextInput);
      expect(input.props.editable).toBe(false);
    });

    it('interactivity: auto does not lift any prop', () => {
      const Free = styled.View`
        interactivity: auto;
      `;
      const tree = TestRenderer.create(<Free pointerEvents="auto" />);
      const root = tree.root.findByType(View);
      expect(root.props.pointerEvents).toBe('auto');
      expect(root.props.focusable).toBeUndefined();
    });

    describeOnRnWeb(() => {
      // rn-web deprecated `props.pointerEvents` in favor of
      // `style.pointerEvents`; the lift would trigger a runtime
      // deprecation warning on every render.
      it('pointer-events stays in style on rn-web (no prop lift)', () => {
        const NoTouch = styled.View`
          pointer-events: none;
        `;
        const tree = TestRenderer.create(<NoTouch />);
        const root = tree.root.findByType(View);
        expect(root.props.pointerEvents).toBeUndefined();
        const flat = mergeStyle(root.props.style);
        expect(flat.pointerEvents).toBe('none');
      });
    });
  });

  // https://drafts.csswg.org/css-transforms-2/#perspective-property
  describe('perspective composition (CSS Transforms 2 §8)', () => {
    const getMergedStyle = (node: TestRenderer.ReactTestInstance) => mergeStyle(node.props.style);

    it('perspective alone emits a perspective() transform', () => {
      const View3d = styled.View`
        perspective: 500px;
      `;
      const tree = TestRenderer.create(<View3d />);
      const merged = getMergedStyle(tree.root.findByType(View));
      expect(merged.transform).toBe('perspective(500px)');
    });

    it('perspective composes with an author transform (prepends)', () => {
      const Tilt = styled.View`
        perspective: 500px;
        transform: rotateY(45deg);
      `;
      const tree = TestRenderer.create(<Tilt />);
      const merged = getMergedStyle(tree.root.findByType(View));
      expect(merged.transform).toBe('perspective(500px) rotateY(45deg)');
    });

    it('transform-before-perspective in source still prepends perspective', () => {
      const Tilt = styled.View`
        transform: rotateX(30deg);
        perspective: 800px;
      `;
      const tree = TestRenderer.create(<Tilt />);
      const merged = getMergedStyle(tree.root.findByType(View));
      expect(merged.transform).toBe('perspective(800px) rotateX(30deg)');
    });

    it('perspective: none clears when no other transform is set', () => {
      const Reset = styled.View`
        perspective: none;
      `;
      const tree = TestRenderer.create(<Reset />);
      const merged = getMergedStyle(tree.root.findByType(View));
      expect(merged.transform).toBe('none');
    });

    it('perspective: none leaves author transform intact', () => {
      const Spin = styled.View`
        transform: scale(1.2);
        perspective: none;
      `;
      const tree = TestRenderer.create(<Spin />);
      const merged = getMergedStyle(tree.root.findByType(View));
      expect(merged.transform).toBe('scale(1.2)');
    });
  });
});
