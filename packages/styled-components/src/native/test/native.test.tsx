import React, { PropsWithChildren } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  Switch,
  Text,
  TextInput,
  TouchableHighlight,
  TouchableNativeFeedback,
  TouchableWithoutFeedback,
  View,
  ViewProps,
} from 'react-native';
import TestRenderer from 'react-test-renderer';
import styled, { ThemeProvider, css, toStyleSheet, useNativeStyleContext } from '../';
import { resetStyleCache, RN_UNSUPPORTED_VALUES } from '../../models/NativeStyle';
import hoistNonReactStatics from '../../utils/hoist';
import type { NativeCascadeValues } from '../NativeStyleContext';
import { PARENT_SLOT_PROP, type ParentContextValue, useParentContext } from '../ParentContext';
import { resetResponsiveCache } from '../responsive';
import { resetWarningsForTest } from '../transform/dev';

// NOTE: These tests are like the ones for Web but a "light-version" of them
// This is mostly due to the similar logic

function flattenStyle(style: unknown): Array<Record<string, any>> {
  return [style].flat(Infinity).filter(Boolean) as Array<Record<string, any>>;
}

function mergeStyle(style: unknown): Record<string, any> {
  return Object.assign({}, ...flattenStyle(style));
}

/** The function `style` handed to Pressable; its host child receives the resolved result instead. */
function functionStyleOf(element: React.ReactElement): (state: { pressed?: boolean }) => unknown {
  const holders = TestRenderer.create(element).root.findAll(
    node => typeof node.props.style === 'function'
  );
  // The deepest holder is the Pressable the styled component rendered.
  return holders[holders.length - 1].props.style;
}

type PublishedValues = Pick<NativeCascadeValues, 'direction' | 'fontSize' | 'lineHeight'>;

/** An ancestor that declares 12px / 18px, so every expected value is relative to a size it set. */
const CascadeAncestor = styled.View`
  font-size: 12px;
  line-height: 18px;
`;

/** A function interpolation that adds no CSS and sends a component down the dynamic render path. */
const forceDynamic = () => '';

/**
 * Mounts the subject, which receives a probe to place among its children, under
 * {@link CascadeAncestor}. `read` returns what the probe's `useNativeStyleContext()`
 * returned last, so the assertion goes through the public hook.
 */
function mountCascadeProbe(subject: (probe: React.ReactElement) => React.ReactElement) {
  const log: PublishedValues[] = [];

  function Probe() {
    const { cascade } = useNativeStyleContext();
    log.push({
      direction: cascade.direction,
      fontSize: cascade.fontSize,
      lineHeight: cascade.lineHeight,
    });
    return null;
  }

  const render = (next: typeof subject) => <CascadeAncestor>{next(<Probe />)}</CascadeAncestor>;
  const tree = TestRenderer.create(render(subject));

  return {
    log,
    read: () => log[log.length - 1],
    rerender: (next: typeof subject) => TestRenderer.act(() => tree.update(render(next))),
    unmount: () => TestRenderer.act(() => tree.unmount()),
  };
}

const PUBLISHED_BY_ANCESTOR: PublishedValues = { direction: 'ltr', fontSize: 12, lineHeight: 18 };

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

  it('reads an escape in an unquoted font family from a template or an interpolation', () => {
    const Literal = styled.Text`
      font-family: A\\42 B;
    `;
    const Interpolated = styled.Text`
      font-family: ${'Foo\\ Bar'};
    `;

    const literal = TestRenderer.create(<Literal />).root.findByType(Text);
    const interpolated = TestRenderer.create(<Interpolated />).root.findByType(Text);

    expect(literal.props.style).toEqual({ fontFamily: 'ABB' });
    expect(interpolated.props.style).toEqual({ fontFamily: 'Foo Bar' });
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

    it('attrs wins over an explicitly passed undefined prop (#5807)', () => {
      const Comp = styled.View.attrs<{ accessible?: boolean }>({
        accessible: true,
      })``;

      const withDefault = TestRenderer.create(<Comp />);
      expect(withDefault.root.findByType(View).props.accessible).toBe(true);

      const withUndefined = TestRenderer.create(<Comp accessible={undefined} />);
      expect(withUndefined.root.findByType(View).props.accessible).toBe(true);
    });

    it('forwards an explicitly passed undefined prop as an own key (#4338)', () => {
      const Comp = styled.View``;

      const view = TestRenderer.create(<Comp accessible={undefined} />).root.findByType(View);
      expect('accessible' in view.props).toBe(true);
    });

    it('keeps a key out of the element when attrs clear a defined value', () => {
      const Comp = styled.View.attrs<{ accessibilityLabel?: string }>(() => ({
        accessibilityLabel: undefined,
      }))``;

      const view = TestRenderer.create(<Comp accessibilityLabel="original" />).root.findByType(
        View
      );
      expect('accessibilityLabel' in view.props).toBe(false);
    });

    it('an identity-spread attrs function keeps forwarding a caller-passed undefined', () => {
      const Comp = styled.View.attrs<{ accessible?: boolean; nativeID?: string }>(
        ({ nativeID = 'id', ...rest }) => ({ nativeID, ...rest })
      )``;

      const view = TestRenderer.create(<Comp accessible={undefined} />).root.findByType(View);
      expect('accessible' in view.props).toBe(true);
      expect(view.props.nativeID).toBe('id');
    });

    describe('attrs style', () => {
      it('reaches the element after the compiled style', () => {
        const Comp = styled.View.attrs({ style: { backgroundColor: 'red' } })`
          padding-top: 10px;
        `;

        const view = TestRenderer.create(<Comp />).root.findByType(View);
        expect(view.props.style).toEqual([{ paddingTop: 10 }, { backgroundColor: 'red' }]);
      });

      it('reaches the element from the function form', () => {
        const Comp = styled.View.attrs<{ $c?: string }>(p => ({
          style: { backgroundColor: p.$c },
        }))`
          padding-top: 10px;
        `;

        const view = TestRenderer.create(<Comp $c="red" />).root.findByType(View);
        expect(view.props.style).toEqual([{ paddingTop: 10 }, { backgroundColor: 'red' }]);
      });

      it('layers over the caller style, attrs winning a key both set', () => {
        const Comp = styled.View.attrs({ style: { color: 'red' } })`
          padding-top: 10px;
        `;

        const view = TestRenderer.create(
          <Comp style={{ color: 'blue', opacity: 1 }} />
        ).root.findByType(View);
        expect(view.props.style).toEqual([
          { paddingTop: 10 },
          { color: 'blue', opacity: 1 },
          { color: 'red' },
        ]);
        expect(mergeStyle(view.props.style)).toEqual({ color: 'red', opacity: 1, paddingTop: 10 });
      });

      it('is beaten by an !important declaration', () => {
        const Comp = styled.View.attrs({ style: { color: 'red', opacity: 0.5 } })`
          color: green !important;
        `;

        const view = TestRenderer.create(<Comp style={{ color: 'blue' }} />).root.findByType(View);
        expect(mergeStyle(view.props.style)).toEqual({ color: 'green', opacity: 0.5 });
      });

      it('keeps a caller array as given inside its layer', () => {
        const Comp = styled.View.attrs({ style: { color: 'red' } })`
          padding-top: 10px;
        `;

        const view = TestRenderer.create(
          <Comp style={[{ opacity: 1 }, { margin: 2 }]} />
        ).root.findByType(View);
        expect(view.props.style).toEqual([
          { paddingTop: 10 },
          [{ opacity: 1 }, { margin: 2 }],
          { color: 'red' },
        ]);
      });

      it('keeps an attrs array as given inside its layer', () => {
        const Comp = styled.View.attrs({ style: [{ color: 'red' }, [{ margin: 2 }]] })`
          padding-top: 10px;
        `;

        const view = TestRenderer.create(<Comp />).root.findByType(View);
        expect(view.props.style).toEqual([{ paddingTop: 10 }, { color: 'red' }, [{ margin: 2 }]]);
      });

      it('composes with a caller function style on a Pressable, both called with the same state', () => {
        const callerStyle = jest.fn((state: { pressed?: boolean }) =>
          state.pressed ? { opacity: 0.5 } : { opacity: 1 }
        );
        const Comp = styled(Pressable).attrs({ style: { backgroundColor: 'red' } })`
          padding-top: 10px;
        `;

        const style = functionStyleOf(<Comp style={callerStyle} />);
        callerStyle.mockClear();
        expect(style({ pressed: false })).toEqual([
          { paddingTop: 10 },
          { opacity: 1 },
          { backgroundColor: 'red' },
        ]);
        expect(style({ pressed: true })).toEqual([
          { paddingTop: 10 },
          { opacity: 0.5 },
          { backgroundColor: 'red' },
        ]);
        expect(callerStyle.mock.calls).toEqual([[{ pressed: false }], [{ pressed: true }]]);
      });

      it('composes an attrs function style with a caller object style', () => {
        const attrsStyle = jest.fn((state: { pressed?: boolean }) =>
          state.pressed ? { color: 'red' } : { color: 'blue' }
        );
        const Comp = styled(Pressable).attrs({ style: attrsStyle })`
          padding-top: 10px;
        `;

        const style = functionStyleOf(<Comp style={{ opacity: 1 }} />);
        attrsStyle.mockClear();
        expect(style({ pressed: true })).toEqual([
          { paddingTop: 10 },
          { opacity: 1 },
          { color: 'red' },
        ]);
        expect(attrsStyle.mock.calls).toEqual([[{ pressed: true }]]);
      });

      it('layers a two-argument attrs style over the caller style', () => {
        const Comp = styled.View.attrs((_p, ast) => ({
          style: { backgroundColor: ast.pop('color') },
        }))`
          color: red;
          padding-top: 10px;
        `;

        const view = TestRenderer.create(<Comp style={{ opacity: 0.5 }} />).root.findByType(View);
        expect(view.props.style).toEqual([
          { paddingTop: 10 },
          { opacity: 0.5 },
          { backgroundColor: 'red' },
        ]);
      });

      it('layers every attrs style across a wrapped chain, the outer winning', () => {
        const Inner = styled.View.attrs({ style: { color: 'red', margin: 1 } })`
          padding-top: 10px;
        `;
        const Outer = styled(Inner).attrs({ style: { color: 'green' } })``;

        const view = TestRenderer.create(<Outer />).root.findByType(View);
        expect(mergeStyle(view.props.style)).toEqual({ color: 'green', margin: 1, paddingTop: 10 });
      });

      it.each([undefined, null])(
        'keeps the caller style under an attrs style of %s',
        attrsStyle => {
          const Comp = styled.View.attrs({ style: attrsStyle })`
          padding-top: 10px;
        `;

          const view = TestRenderer.create(<Comp style={{ opacity: 0.5 }} />).root.findByType(View);
          expect(mergeStyle(view.props.style)).toEqual({ opacity: 0.5, paddingTop: 10 });
        }
      );
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

    it('drops a value that leaves a block open, keeping the declarations after it', () => {
      const cssStyle = css`
        border-width: ${'10px; a { top: 1px'};
        opacity: 1;
      `;

      expect(toStyleSheet(cssStyle)).toEqual({ borderWidth: 10, opacity: 1 });
    });

    // CSS Color 4: "<opacity-value> = <number> | <percentage>"; a percentage "computes to the
    // equivalent <number> (0% to 0, 100% to 1)".
    it('converts a percentage opacity to a number', () => {
      expect(
        toStyleSheet(css`
          opacity: 50%;
        `)
      ).toEqual({ opacity: 0.5 });
    });

    it('converts a percentage opacity from an interpolated value', () => {
      expect(toStyleSheet(css`opacity: ${'25%'};`)).toEqual({ opacity: 0.25 });
    });

    it('converts a percentage opacity inside a matching @media block', () => {
      const Comp = styled.View`
        @media (min-width: 100px) {
          opacity: 50%;
        }
      `;
      const view = TestRenderer.create(<Comp />).root.findByType(View);
      expect(mergeStyle(view.props.style).opacity).toBe(0.5);
    });

    it.each<[string, () => ReturnType<typeof css>]>([
      ['authored text', () => css`box-shadow: 0 0 1px red, 0 0 2px blue;`],
      ['a value', () => css`box-shadow: ${'0 0 1px red, 0 0 2px blue'};`],
      ['a function value', () => css`box-shadow: ${() => '0 0 1px red, 0 0 2px blue'};`],
    ])('keeps the space after a comma from %s', (_title, build) => {
      expect(toStyleSheet(build())).toEqual({ boxShadow: '0 0 1px red, 0 0 2px blue' });
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

      it.each([
        [
          'a folded callback',
          (_p: { $on?: boolean }, ast: any) => ({ fill: ast.pop('background-color') }),
        ],
        [
          'a props-reading callback',
          (p: { $on?: boolean }, ast: any) => ({
            fill: p.$on ? ast.pop('background-color') : 'off',
          }),
        ],
      ])('camelizes a kebab-case key popped by %s', (_name, cb) => {
        const Comp = styled.View.attrs<{ $on?: boolean; fill?: string }>(cb)`
          background-color: red;
          padding: 5px;
        `;

        const view = TestRenderer.create(<Comp $on />).root.findByType(View);

        expect([view.props.fill, view.props.style]).toEqual(['red', { padding: 5 }]);
      });

      it('camelizes a kebab-case key peeked by a props-reading callback', () => {
        const Comp = styled.View.attrs<{ $on?: boolean; tint?: string }>((p, ast) => ({
          tint: p.$on ? ast.peek('background-color') : 'off',
        }))`
          background-color: red;
        `;

        const view = TestRenderer.create(<Comp $on />).root.findByType(View);

        expect([view.props.tint, view.props.style]).toEqual(['red', { backgroundColor: 'red' }]);
      });

      // A camelCase key against a kebab-case declaration is only knowable at
      // render time (a polyfill may transform the value), so it never folds
      // the raw CSS text. The render-time value of light-dark() is not in
      // the base style, so the read is undefined and the style is untouched.
      it.each([
        [
          'a static callback',
          (_p: { $on?: boolean }, ast: any) => ({ tint: ast.pop('backgroundColor') }),
        ],
        [
          'a props-reading callback',
          (p: { $on?: boolean }, ast: any) => ({
            tint: p.$on ? ast.pop('backgroundColor') : 'off',
          }),
        ],
      ])(
        '%s popping a camelCase key reads the render-time value, not the raw CSS text',
        (_name, cb) => {
          const Comp = styled.View.attrs<{ $on?: boolean; tint?: unknown }>(cb)`
          background-color: light-dark(white, black);
        `;

          const view = TestRenderer.create(<Comp $on />).root.findByType(View);

          expect([view.props.tint, view.props.style]).toEqual([
            undefined,
            { backgroundColor: 'white' },
          ]);
        }
      );

      // The compiled style spells a vendor-prefixed declaration without its
      // prefix, so the pop has to remove that spelling.
      it.each([
        [
          'a folded callback',
          (_p: { $on?: boolean }, ast: any) => ({ tint: ast.pop('-webkit-text-fill-color') }),
        ],
        [
          'a props-reading callback',
          (p: { $on?: boolean }, ast: any) => ({
            tint: p.$on ? ast.pop('-webkit-text-fill-color') : 'off',
          }),
        ],
      ])('removes a vendor-prefixed declaration popped by %s', (_name, cb) => {
        const Comp = styled.View.attrs<{ $on?: boolean; tint?: unknown }>(cb)`
          -webkit-text-fill-color: red;
          color: blue;
        `;

        const view = TestRenderer.create(<Comp $on />).root.findByType(View);

        expect([view.props.tint, view.props.style]).toEqual(['red', { color: 'blue' }]);
      });

      it('peeks a vendor-prefixed declaration by its compiled spelling in a callback that reads no props', () => {
        const Comp = styled.View.attrs<{ tint?: unknown }>((_p, ast) => ({
          tint: ast.peek('textFillColor'),
        }))`
          -webkit-text-fill-color: red;
        `;

        const view = TestRenderer.create(<Comp />).root.findByType(View);

        expect(view.props.tint).toBe('red');
      });

      it('reads a popped value again under a different spelling of the same key', () => {
        const Comp = styled.View.attrs<{ $on?: boolean; again?: unknown; first?: unknown }>(
          (p, ast) =>
            p.$on ? { first: ast.pop('background-color'), again: ast.peek('backgroundColor') } : {}
        )`
          background-color: red;
          padding: 5px;
        `;

        const view = TestRenderer.create(<Comp $on />).root.findByType(View);

        expect([view.props.first, view.props.again, view.props.style]).toEqual([
          'red',
          'red',
          { padding: 5 },
        ]);
      });

      it('pops a custom property by its verbatim name', () => {
        const Comp = styled.View.attrs<{ $on?: boolean; tint?: unknown }>((p, ast) => ({
          tint: p.$on ? ast.pop('--tint') : 'off',
        }))`
          --tint: red;
          padding: 5px;
        `;

        const view = TestRenderer.create(<Comp $on />).root.findByType(View);

        expect([view.props.tint, view.props.style]).toEqual([undefined, { padding: 5 }]);
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

      it('applies an arity-2 callback added when extending a styled component that has none', () => {
        const Base = styled.View`
          color: blue;
        `;
        const Extended = styled(Base).attrs<{ tint?: string }>((_props, ast) => ({
          tint: ast.peek('color'),
        }))``;

        const view = TestRenderer.create(<Extended />).root.findByType(View);

        expect(view.props.tint).toBe('blue');
      });

      it("keeps a base's arity-2 callback reading the whole chain when an extension adds only CSS", () => {
        const Base = styled.View.attrs<{ pad?: string; tint?: string }>((_props, ast) => ({
          pad: ast.peek('padding'),
          tint: ast.peek('color'),
        }))`
          color: blue;
        `;
        const Extended = styled(Base)`
          padding: 4px;
        `;

        const view = TestRenderer.create(<Extended />).root.findByType(View);

        expect([view.props.tint, view.props.pad]).toEqual(['blue', '4px']);
      });

      it("reads the extension's value when base and extension declare the same property", () => {
        const Base = styled.View`
          color: red;
        `;
        const Extended = styled(Base).attrs<{ tint?: string }>((_props, ast) => ({
          tint: ast.pop('color'),
        }))`
          color: blue;
        `;

        const view = TestRenderer.create(<Extended />).root.findByType(View);

        // The extension's declaration wins the cascade, so it is the value
        // pop lifts and removes from the style.
        expect([view.props.tint, view.props.style]).toEqual(['blue', {}]);
      });

      it('reads the last declaration when one template repeats a property', () => {
        const Comp = styled.View.attrs<{ tint?: string }>((_props, ast) => ({
          tint: ast.pop('color'),
        }))`
          color: red;
          color: blue;
        `;

        const view = TestRenderer.create(<Comp />).root.findByType(View);

        expect([view.props.tint, view.props.style]).toEqual(['blue', {}]);
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

      it('post-compile attrs win over an explicit undefined prop', () => {
        const Comp = styled.View.attrs<{ fill?: string }>((_props, ast) => ({
          fill: ast.pop('color'),
        }))`
          color: red;
        `;

        const wrapper = TestRenderer.create(<Comp fill={undefined} />);
        const view = wrapper.root.findByType(View);

        // Attrs win over a caller's `fill={undefined}`, as arity-1 attrs do.
        expect(view.props.fill).toBe('red');
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

  describe('outermost-wrapper style function (attrs marker contract)', () => {
    let nextLayerId: number;
    // Records the id of the layer that ran it, since folded native layers share one style.
    let systemStyles: jest.Mock<string, [number]>;

    const createLayer = (tag: any) => {
      const layerId = ++nextLayerId;

      return (strings: TemplateStringsArray) =>
        styled(tag).attrs({ $styleOwner: layerId })(strings, (props: Record<string, unknown>) =>
          props.$styleOwner === layerId ? systemStyles(layerId) : null
        );
    };

    beforeEach(() => {
      nextLayerId = 0;
      systemStyles = jest.fn(() => 'margin-top: 7px;');
    });

    it('runs the style function once for wrapped View layers, and the marker does not reach the host', () => {
      const Inner = createLayer(View)`
        padding-top: 1px;
      `;
      const Outer = createLayer(Inner)`
        padding-bottom: 2px;
      `;
      const view = TestRenderer.create(<Outer />).root.findByType(View);

      expect(systemStyles.mock.calls).toEqual([[2]]);
      expect(mergeStyle(view.props.style)).toEqual({
        marginTop: 7,
        paddingBottom: 2,
        paddingTop: 1,
      });
      expect(view.props).not.toHaveProperty('$styleOwner');
    });

    it('still runs the style function for the inner layer rendered alone', () => {
      const Inner = createLayer(View)`
        padding-top: 1px;
      `;
      createLayer(Inner)`
        padding-bottom: 2px;
      `;
      const view = TestRenderer.create(<Inner />).root.findByType(View);

      expect(systemStyles.mock.calls).toEqual([[1]]);
      expect(mergeStyle(view.props.style)).toEqual({ marginTop: 7, paddingTop: 1 });
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

    it.each<[string, unknown]>([
      ['a function with two parameters', (_p: unknown, _unused?: unknown) => 'opacity: 0.5;'],
      ['an array', ['opacity: 0.5;']],
      ['a function returning an array', () => ['opacity: 0.5;']],
    ])('reads %s and keeps the other styles', (_title, value) => {
      const Comp = styled.View`
        ${value as string}
        margin-top: 1px;
      `;
      const view = TestRenderer.create(<Comp />).root.findByType(View);
      expect(view.props.style).toEqual({ marginTop: 1, opacity: 0.5 });
    });

    it('reads a value with no semicolon of its own before a slot property as a declaration', () => {
      const Comp = styled.View`
        ${() => 'margin-top: 1px'}
        ${'opacity'}: 0.5;
      `;
      const view = TestRenderer.create(<Comp />).root.findByType(View);
      expect(view.props.style).toEqual({ marginTop: 1, opacity: 0.5 });
    });

    it.each<[string, unknown]>([
      ['true', true],
      ['a function returning true', () => true],
    ])('adds nothing for %s and keeps the other styles', (_title, value) => {
      const Comp = styled.View`
        ${value as string}
        margin-top: 1px;
      `;
      const view = TestRenderer.create(<Comp />).root.findByType(View);
      expect(view.props.style).toEqual({ marginTop: 1 });
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

    // The static render path publishes its own font size, line height and
    // direction, so declaring them does not need the dynamic path. Values that
    // are only known at render time (`!important`, `var()`, `rem`) still do.
    it.each([
      ['font-size', 'font-size: 24px;'],
      ['line-height', 'line-height: 32px;'],
      ['direction', 'direction: rtl;'],
    ])('a %s declaration keeps a component static-eligible', (_name, css) => {
      const Comp = styled.View`
        ${css}
      `;
      expect(Comp.nativeStyle.staticEligible).toBe(true);
    });

    it.each([
      ['an !important font-size', 'font-size: 24px !important;'],
      ['a var() font-size', 'font-size: var(--s);'],
      ['a rem font-size', 'font-size: 2rem;'],
    ])('%s is not static-eligible', (_name, css) => {
      const Comp = styled.View`
        ${css}
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

    // CSS Cascade 5, "The cascaded value represents the result of the cascade: it is the
    // declared value that wins the cascade (is sorted first in the output of the cascade)."
    // A static component publishes the winner among its own CSS and the caller's `style`.
    describe('static component publishes its cascade', () => {
      const Plain = styled.View`
        color: red;
      `;
      const Sized = styled.View`
        font-size: 30px;
      `;
      const Contained = styled.View`
        container-type: inline-size;
      `;

      it('takes the static path for every subject below', () => {
        expect([Plain, Sized, Contained].map(c => c.nativeStyle.staticEligible)).toEqual([
          true,
          true,
          true,
        ]);
      });

      it.each<[string, (probe: React.ReactElement) => React.ReactElement, PublishedValues]>([
        [
          'its own font-size',
          probe => <Sized>{probe}</Sized>,
          { direction: 'ltr', fontSize: 30, lineHeight: 18 },
        ],
        [
          'a caller style object',
          probe => <Plain style={{ fontSize: 20 }}>{probe}</Plain>,
          { direction: 'ltr', fontSize: 20, lineHeight: 18 },
        ],
        [
          'the last of a caller style array',
          probe => <Plain style={[{ fontSize: 10 }, { fontSize: 20 }]}>{probe}</Plain>,
          { direction: 'ltr', fontSize: 20, lineHeight: 18 },
        ],
        [
          'a caller style over its CSS',
          probe => <Sized style={{ fontSize: 20 }}>{probe}</Sized>,
          { direction: 'ltr', fontSize: 20, lineHeight: 18 },
        ],
        [
          'the ancestor font-size when the winning layer holds undefined',
          probe => <Sized style={{ fontSize: undefined }}>{probe}</Sized>,
          PUBLISHED_BY_ANCESTOR,
        ],
        [
          'a caller font-size on a container',
          probe => <Contained style={{ fontSize: 20 }}>{probe}</Contained>,
          { direction: 'ltr', fontSize: 20, lineHeight: 18 },
        ],
      ])('publishes %s', (_name, subject, expected) => {
        expect(mountCascadeProbe(subject).read()).toEqual(expected);
      });
    });
  });

  describe('cascade publishing from every source', () => {
    // rn-web has no rows: the bridge hands CSS to the browser, which cascades these values itself,
    // and never runs this engine.
    const TWENTY: PublishedValues = { direction: 'ltr', fontSize: 20, lineHeight: 18 };

    beforeEach(() => {
      resetWarningsForTest();
    });

    it.each<[string, (probe: React.ReactElement) => React.ReactElement, PublishedValues]>([
      [
        'an !important font-size',
        probe => {
          const S = styled.View`
            font-size: 20px !important;
            ${forceDynamic}
          `;
          return <S>{probe}</S>;
        },
        TWENTY,
      ],
      [
        'an !important font-size inside @media',
        probe => {
          const S = styled.View`
            @media (min-width: 100px) {
              font-size: 20px !important;
            }
            ${forceDynamic}
          `;
          return <S>{probe}</S>;
        },
        TWENTY,
      ],
      [
        'an !important font-size over the caller style',
        probe => {
          const S = styled.View`
            font-size: 20px !important;
            ${forceDynamic}
          `;
          return <S style={{ fontSize: 30 }}>{probe}</S>;
        },
        TWENTY,
      ],
      [
        'a font-size set by its own var()',
        probe => {
          const S = styled.View`
            --s: 20px;
            font-size: var(--s);
          `;
          return <S>{probe}</S>;
        },
        TWENTY,
      ],
      [
        'a line-height set by its own var()',
        probe => {
          const S = styled.View`
            --l: 30px;
            line-height: var(--l);
          `;
          return <S>{probe}</S>;
        },
        { direction: 'ltr', fontSize: 12, lineHeight: 30 },
      ],
      [
        'a direction set by its own var()',
        probe => {
          const S = styled.View`
            --d: rtl;
            direction: var(--d);
          `;
          return <S>{probe}</S>;
        },
        { direction: 'rtl', fontSize: 12, lineHeight: 18 },
      ],
      [
        'a font-size set by a var() inside @media',
        probe => {
          const S = styled.View`
            --s: 20px;
            @media (min-width: 100px) {
              font-size: var(--s);
            }
          `;
          return <S>{probe}</S>;
        },
        TWENTY,
      ],
      [
        'a font shorthand set by a var()',
        probe => {
          const S = styled.View`
            --f: 20px serif;
            font: var(--f);
          `;
          return <S>{probe}</S>;
        },
        { direction: 'ltr', fontSize: 20, lineHeight: 18 },
      ],
      [
        'a font-size set by a var() from an ancestor',
        probe => {
          const Vars = styled.View`
            --s: 20px;
          `;
          const S = styled.View`
            font-size: var(--s);
          `;
          return (
            <Vars>
              <S>{probe}</S>
            </Vars>
          );
        },
        TWENTY,
      ],
      [
        'an !important font-size set by a var()',
        probe => {
          const S = styled.View`
            --s: 20px;
            font-size: var(--s) !important;
          `;
          return <S style={{ fontSize: 30 }}>{probe}</S>;
        },
        TWENTY,
      ],
      [
        'the ancestor font-size when the winning layer holds undefined',
        probe => {
          const S = styled.View`
            font-size: 20px;
            ${forceDynamic}
          `;
          return <S style={{ fontSize: undefined }}>{probe}</S>;
        },
        PUBLISHED_BY_ANCESTOR,
      ],
      [
        'the CSS font-size under an animated caller font-size',
        probe => {
          const S = styled.View`
            font-size: 20px;
            ${forceDynamic}
          `;
          return <S style={{ fontSize: new Animated.Value(30) as any }}>{probe}</S>;
        },
        TWENTY,
      ],
      [
        'the resting font-size of a custom component with a function style',
        probe => {
          const Custom = (props: any) => <View {...props} />;
          const S = styled(Custom)`
            ${forceDynamic}
          `;
          return <S style={(state: any) => ({ fontSize: state.pressed ? 30 : 20 })}>{probe}</S>;
        },
        TWENTY,
      ],
    ])('publishes %s', (_name, subject, expected) => {
      expect(mountCascadeProbe(subject).read()).toEqual(expected);
    });

    // Guards: each passes before the change, and keeps passing.
    it.each<[string, (probe: React.ReactElement) => React.ReactElement, PublishedValues]>([
      [
        'a base font-size',
        probe => {
          const S = styled.View`
            font-size: 20px;
            ${forceDynamic}
          `;
          return <S>{probe}</S>;
        },
        TWENTY,
      ],
      [
        'a font-size inside a matching @media',
        probe => {
          const S = styled.View`
            @media (min-width: 100px) {
              font-size: 20px;
            }
          `;
          return <S>{probe}</S>;
        },
        TWENTY,
      ],
      [
        'a rem font-size against the 16px root',
        probe => {
          const S = styled.View`
            font-size: 2rem;
          `;
          return <S>{probe}</S>;
        },
        { direction: 'ltr', fontSize: 32, lineHeight: 18 },
      ],
      [
        'an attrs style object',
        probe => {
          const S = styled.View.attrs({ style: { fontSize: 20 } })``;
          return <S>{probe}</S>;
        },
        TWENTY,
      ],
      [
        'a caller style object',
        probe => {
          const S = styled.View`
            ${forceDynamic}
          `;
          return <S style={{ fontSize: 20 }}>{probe}</S>;
        },
        TWENTY,
      ],
      [
        'the last of a caller style array',
        probe => {
          const S = styled.View`
            ${forceDynamic}
          `;
          return <S style={[{ fontSize: 10 }, { fontSize: 20 }]}>{probe}</S>;
        },
        TWENTY,
      ],
      [
        'a caller style array nested with null and false entries',
        probe => {
          const S = styled.View`
            ${forceDynamic}
          `;
          return <S style={[null, [false, { fontSize: 20 }], null]}>{probe}</S>;
        },
        TWENTY,
      ],
      [
        'a caller style over its CSS',
        probe => {
          const S = styled.View`
            font-size: 30px;
            ${forceDynamic}
          `;
          return <S style={{ fontSize: 20 }}>{probe}</S>;
        },
        TWENTY,
      ],
      [
        'the ancestor direction for direction: inherit',
        probe => {
          const S = styled.View`
            direction: rtl;
            ${forceDynamic}
          `;
          return <S style={{ direction: 'inherit' }}>{probe}</S>;
        },
        PUBLISHED_BY_ANCESTOR,
      ],
      [
        'the ancestor font-size for a View with a function style',
        probe => {
          const S = styled.View`
            ${forceDynamic}
          `;
          return <S style={() => ({ fontSize: 30 })}>{probe}</S>;
        },
        PUBLISHED_BY_ANCESTOR,
      ],
    ])('publishes %s', (_name, subject, expected) => {
      expect(mountCascadeProbe(subject).read()).toEqual(expected);
    });

    it('publishes the base font-size of a View with an :active font-size, and warns once', () => {
      const S = styled.View`
        font-size: 20px;
        &:active {
          font-size: 30px;
        }
      `;

      const probed = mountCascadeProbe(probe => <S>{probe}</S>);

      expect(probed.read()).toEqual(TWENTY);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('publishes the CSS font-size of a transition at once', () => {
      const S = styled.View<{ $size: number }>`
        font-size: ${p => p.$size}px;
        transition: font-size 1s;
      `;

      const probed = mountCascadeProbe(probe => <S $size={20}>{probe}</S>);
      probed.rerender(probe => <S $size={30}>{probe}</S>);
      const published = probed.read();
      // The transition's frame timer must not outlive the test.
      probed.unmount();

      expect(published).toEqual({ direction: 'ltr', fontSize: 30, lineHeight: 18 });
    });

    // A Pressable hands its pressed state to a `style` function, so what it publishes
    // depends on that state. `testOnly_pressed` holds the Pressable pressed.
    describe('a styled Pressable', () => {
      const ByFunctionStyle = styled(Pressable)`
        ${forceDynamic}
      `;
      const ByAttrsStyle = styled(Pressable).attrs({
        style: (state: any) => ({ fontSize: state.pressed ? 30 : 20 }),
      })``;
      const ByActive = styled(Pressable)`
        &:active {
          font-size: 30px;
        }
      `;
      const ByBaseAndActiveOpacity = styled(Pressable)`
        font-size: 20px;
        &:active {
          opacity: 0.5;
        }
      `;
      const StaticByFunctionStyle = styled(Pressable)`
        color: red;
      `;
      const sizeByState = (state: any) => ({ fontSize: state.pressed ? 30 : 20 });
      const PRESSED: PublishedValues = { direction: 'ltr', fontSize: 30, lineHeight: 18 };

      it('is static for the static row below', () => {
        expect(StaticByFunctionStyle.nativeStyle.staticEligible).toBe(true);
      });

      it.each<
        [
          string,
          (probe: React.ReactElement, pressed: boolean) => React.ReactElement,
          PublishedValues,
          PublishedValues,
        ]
      >([
        [
          'a function style',
          (probe, pressed) => (
            <ByFunctionStyle testOnly_pressed={pressed} style={sizeByState}>
              {probe}
            </ByFunctionStyle>
          ),
          TWENTY,
          PRESSED,
        ],
        [
          'an attrs style function',
          (probe, pressed) => <ByAttrsStyle testOnly_pressed={pressed}>{probe}</ByAttrsStyle>,
          TWENTY,
          PRESSED,
        ],
        [
          'an :active font-size',
          (probe, pressed) => <ByActive testOnly_pressed={pressed}>{probe}</ByActive>,
          PUBLISHED_BY_ANCESTOR,
          PRESSED,
        ],
        [
          'a base font-size with an :active opacity',
          (probe, pressed) => (
            <ByBaseAndActiveOpacity testOnly_pressed={pressed}>{probe}</ByBaseAndActiveOpacity>
          ),
          TWENTY,
          TWENTY,
        ],
        [
          'a function style on a static component',
          (probe, pressed) => (
            <StaticByFunctionStyle testOnly_pressed={pressed} style={sizeByState}>
              {probe}
            </StaticByFunctionStyle>
          ),
          TWENTY,
          PRESSED,
        ],
      ])('publishes %s at rest and while pressed', (_name, subject, atRest, whilePressed) => {
        expect(mountCascadeProbe(probe => subject(probe, false)).read()).toEqual(atRest);
        expect(mountCascadeProbe(probe => subject(probe, true)).read()).toEqual(whilePressed);
      });

      it('publishes the pressed size to a child of a function children Pressable', () => {
        const probed = mountCascadeProbe(probe => (
          <ByActive testOnly_pressed>{() => probe}</ByActive>
        ));

        expect(probed.read()).toEqual(PRESSED);
      });

      describe('with a container or grid', () => {
        const Contained = styled.View`
          container-type: inline-size;
        `;
        const Reader = styled.View`
          font-size: 1em;
          @container (max-width: 100px) {
            margin-top: 5px;
          }
        `;
        const PressContainer = styled(Pressable)`
          container-type: inline-size;
          &:active {
            font-size: 30px;
          }
        `;
        const PressGrid = styled(Pressable)`
          display: grid;
          grid-template-columns: 1fr 1fr;
          &:active {
            font-size: 30px;
          }
        `;
        const GridItem = styled.View`
          font-size: 1em;
        `;

        /** The reader's host style: the last View in the tree. */
        const hostStyleOf = (tree: TestRenderer.ReactTestRenderer) => {
          const views = tree.root.findAllByType(View);
          return mergeStyle(views[views.length - 1].props.style);
        };

        it('keeps the container entry above a pressed Pressable', () => {
          const tree = TestRenderer.create(
            <Contained>
              <ByActive testOnly_pressed>
                <Reader />
              </ByActive>
            </Contained>
          );

          expect(hostStyleOf(tree)).toEqual({ fontSize: 30, marginTop: 5 });
        });

        it('keeps the container entry of a Pressable that is the container while it is pressed', () => {
          const tree = TestRenderer.create(
            <PressContainer testOnly_pressed>
              <Reader />
            </PressContainer>
          );

          expect(hostStyleOf(tree)).toEqual({ fontSize: 30, marginTop: 5 });
        });

        it('keeps the grid entry of a Pressable that is the grid while it is pressed', () => {
          const tree = TestRenderer.create(
            <PressGrid testOnly_pressed>
              <GridItem />
            </PressGrid>
          );

          expect(hostStyleOf(tree)).toEqual({ fontSize: 30, width: '50%' });
        });
      });
    });
  });

  // https://drafts.csswg.org/css-values-4/#em (editor's draft)
  //
  // "On the other hand: h1 { font-size: 1.2em } means that the font size of h1 elements
  // will be 20% greater than the computed font size inherited by h1 elements."
  //
  // https://drafts.csswg.org/css-values-4/#calc-serialize (editor's draft, 10.13 Serialization)
  //
  // "If the root of the calculation tree fn represents is a numeric value (number,
  // percentage, or dimension), and the serialization being produced is of a computed
  // value or later, then clamp the value to the range allowed for its context (if
  // necessary), then serialize the value as normal and return the result."
  //
  // https://drafts.csswg.org/css-fonts-4/#font-size-prop (editor's draft)
  //
  // "Value: <absolute-size> | <relative-size> | <length-percentage [0,∞]> | math"
  describe('math functions in font properties resolve at render time', () => {
    const renderUnder20px = (Child: React.ComponentType<PropsWithChildren>) => {
      const Parent = styled.View`
        font-size: 20px;
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Child>hi</Child>
        </Parent>
      );
      return mergeStyle(tree.root.findByType(Text).props.style);
    };

    it('font-size: em inside calc refers to the parent font size', () => {
      const Child = styled.Text`
        font-size: calc(1em + 2px);
      `;
      expect(renderUnder20px(Child).fontSize).toBe(22);
    });

    it('font-size: a calc result below zero clamps to zero', () => {
      const Child = styled.Text`
        font-size: calc(1em - 30px);
      `;
      expect(renderUnder20px(Child).fontSize).toBe(0);
    });

    it('font-size: a static calc result below zero clamps to zero', () => {
      const Child = styled.Text`
        font-size: calc(2px - 10px);
      `;
      expect(renderUnder20px(Child).fontSize).toBe(0);
    });

    // The jest window is 750 wide, so 2vw is 15.
    it.each([
      ['clamp(14px, 2vw, 20px)', 15],
      ['clamp(16px, 2vw, 20px)', 16],
      ['clamp(10px, 2vw, 12px)', 12],
      ['min(2vw, 12px)', 12],
      ['max(2vw, 18px)', 18],
    ])('font-size: %s resolves against the window width to %i', (value, expected) => {
      const Child = styled.Text`
        font-size: ${value};
      `;
      expect(renderUnder20px(Child).fontSize).toBe(expected);
    });

    it('font-size: a calc value publishes to descendants resolving 1em', () => {
      const Middle = styled.View`
        font-size: calc(1em + 2px);
      `;
      const Child = styled.Text`
        font-size: 1em;
      `;
      const Wrapped = () => (
        <Middle>
          <Child>hi</Child>
        </Middle>
      );
      expect(renderUnder20px(Wrapped as React.ComponentType<PropsWithChildren>).fontSize).toBe(22);
    });

    it('line-height: em inside calc refers to the font size', () => {
      const Child = styled.Text`
        line-height: calc(1em + 4px);
      `;
      expect(renderUnder20px(Child).lineHeight).toBe(24);
    });

    it('letter-spacing: em inside calc refers to the font size', () => {
      const Child = styled.Text`
        letter-spacing: calc(0.1em + 1px);
      `;
      expect(renderUnder20px(Child).letterSpacing).toBe(3);
    });

    it('font: math in the size and line-height slots resolves', () => {
      const Child = styled.Text`
        font: italic calc(1em + 2px) / calc(20px + 4px) serif;
      `;
      const style = renderUnder20px(Child);
      expect(style.fontSize).toBe(22);
      expect(style.lineHeight).toBe(24);
    });
  });

  // https://drafts.csswg.org/css-values-4/#calc-range (editor's draft, 10.12 Range Checking)
  //
  // "numeric functions returning out-of-range values never cause a declaration to become
  // invalid. Instead, the value of a numeric function is clamped to the range allowed in the
  // context it is used at computed value time if possible, and at used value time otherwise.
  // Similarly, if a numeric function returns a non-integer value, but is used in a position
  // that expects an <integer>, the computed value and used value are rounded to the nearest
  // integer."
  //
  // "Since widths smaller than 0px are not allowed, these three declarations are equivalent:
  // width: calc(5px - 10px); width: calc(-5px); width: 0px;"
  describe('a math result is clamped to the range of its property in the rendered style', () => {
    const renderStyle = (Child: React.ComponentType<PropsWithChildren>) => {
      const Parent = styled.View`
        font-size: 20px;
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Child>hi</Child>
        </Parent>
      );
      return mergeStyle(tree.root.findByType(Text).props.style);
    };

    // 1em is 20px under the parent, so each value is -10px before range checking.
    it('width, padding, border-width, and border-radius clamp to 0', () => {
      const Child = styled.Text`
        width: calc(1em - 30px);
        padding: calc(1em - 30px);
        padding-block: calc(1em - 30px);
        border-width: calc(1em - 30px);
        border-block-width: calc(1em - 30px);
        border-radius: calc(1em - 30px);
        row-gap: calc(1em - 30px);
      `;
      const style = renderStyle(Child);
      expect({
        borderBottomWidth: style.borderBottomWidth,
        borderRadius: style.borderRadius,
        borderTopWidth: style.borderTopWidth,
        borderWidth: style.borderWidth,
        padding: style.padding,
        paddingBottom: style.paddingBottom,
        paddingTop: style.paddingTop,
        rowGap: style.rowGap,
        width: style.width,
      }).toEqual({
        borderBottomWidth: 0,
        borderRadius: 0,
        borderTopWidth: 0,
        borderWidth: 0,
        padding: 0,
        paddingBottom: 0,
        paddingTop: 0,
        rowGap: 0,
        width: 0,
      });
    });

    it('a static result clamps at compile time', () => {
      const Child = styled.Text`
        width: calc(2px - 10px);
        opacity: calc(5 - 3);
        z-index: calc(7 / 3);
      `;
      const style = renderStyle(Child);
      expect({ opacity: style.opacity, width: style.width, zIndex: style.zIndex }).toEqual({
        opacity: 1,
        width: 0,
        zIndex: 2,
      });
    });

    it('a property with no range keeps a negative result', () => {
      const Child = styled.Text`
        margin-top: calc(1em - 30px);
      `;
      expect(renderStyle(Child).marginTop).toBe(-10);
    });

    // A var() is substituted before the declaration is transformed, so the drop for an
    // unbuildable function never sees one.
    it('math around var() resolves after substitution, and clamps', () => {
      const Parent = styled.View`
        --gap: 10px;
      `;
      const Child = styled.Text`
        width: calc(var(--gap) + 2px);
        height: min(var(--gap), 5px);
        padding-top: calc(var(--gap) - 30px);
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Child>hi</Child>
        </Parent>
      );
      const style = mergeStyle(tree.root.findByType(Text).props.style);
      expect({ height: style.height, paddingTop: style.paddingTop, width: style.width }).toEqual({
        height: 5,
        paddingTop: 0,
        width: 12,
      });
    });

    // "if the type is failure, the math function is invalid": a shorthand drops whole, so no
    // function text reaches the host.
    it('a math function with inconsistent types drops the declaration, shorthand or not', () => {
      resetWarningsForTest();
      const Child = styled.Text`
        margin: calc(1 + 5px);
        width: min(1, 5px);
        height: 3px;
      `;
      const style = renderStyle(Child);
      expect({
        height: style.height,
        marginTop: style.marginTop,
        marginLeft: style.marginLeft,
        width: style.width,
      }).toEqual({ height: 3, marginLeft: undefined, marginTop: undefined, width: undefined });
      expect(warnSpy.mock.calls.map(call => String(call[0]).split('\n')[0])).toEqual([
        '[sc] the value "calc(1 + 5px)" for "margin" is a math function React Native cannot resolve, so the declaration was ignored. Give every operand the same type, and put font-relative or viewport operands in calc(), min(), max() or clamp().',
        '[sc] the value "min(1, 5px)" for "width" is a math function React Native cannot resolve, so the declaration was ignored. Give every operand the same type, and put font-relative or viewport operands in calc(), min(), max() or clamp().',
      ]);
    });

    it('a math function no resolver builds drops the declaration with a warning', () => {
      resetWarningsForTest();
      const Child = styled.Text`
        width: mod(7, 3px);
        height: abs(1em);
        margin-top: 4px;
      `;
      const style = renderStyle(Child);
      expect({ height: style.height, marginTop: style.marginTop, width: style.width }).toEqual({
        height: undefined,
        marginTop: 4,
        width: undefined,
      });
      expect(warnSpy.mock.calls.map(call => String(call[0]).split('\n')[0])).toEqual([
        '[sc] the value "mod(7, 3px)" for "width" is a math function React Native cannot resolve, so the declaration was ignored. Give every operand the same type, and put font-relative or viewport operands in calc(), min(), max() or clamp().',
        '[sc] the value "abs(1em)" for "height" is a math function React Native cannot resolve, so the declaration was ignored. Give every operand the same type, and put font-relative or viewport operands in calc(), min(), max() or clamp().',
      ]);
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

      // The implicit container name travels to descendants through context;
      // React Native's view manager ignores a `containerName` style key.
      it('adds no containerName style key for a container without container-name', () => {
        const Card = styled.View.withConfig({ displayName: 'AutoNameCard' })`
          container-type: size;
        `;
        const wrapper = TestRenderer.create(<Card />);
        const view = wrapper.root.findByType(View);
        expect(mergeStyle(view.props.style)).not.toHaveProperty('containerName');
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

      it('composes a container with an object user style', () => {
        const Card = styled.View.withConfig({ displayName: 'AutoNameUserCard' })`
          container-type: size;
        `;
        const wrapper = TestRenderer.create(<Card style={{ opacity: 0.7 }} />);
        const view = wrapper.root.findByType(View);
        const merged = mergeStyle(view.props.style);
        expect(merged.opacity).toBe(0.7);
        expect(merged).not.toHaveProperty('containerName');
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

      it('keeps a function-form user style on a container', () => {
        const Card = styled.View.withConfig({ displayName: 'AutoNameFnCard' })`
          container-type: size;
        `;
        const userStyle = (state: { pressed?: boolean }) =>
          state.pressed ? { opacity: 0.5 } : { opacity: 1 };
        const wrapper = TestRenderer.create(<Card style={userStyle} />);
        const view = wrapper.root.findByType(View);
        expect(typeof view.props.style).toBe('function');
        const merged = mergeStyle(view.props.style({ pressed: true }));
        expect(merged.opacity).toBe(0.5);
        expect(merged).not.toHaveProperty('containerName');
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

      it('adds no containerName style key for a container on the dynamic path', () => {
        const Card = styled.View.withConfig({ displayName: 'DynAutoNameCard' })<{ $w: number }>`
          width: ${p => p.$w}px;
          container-type: size;
        `;
        expect(Card.nativeStyle.staticEligible).toBe(false);
        const wrapper = TestRenderer.create(<Card $w={200} />);
        const view = wrapper.root.findByType(View);
        const merged = mergeStyle(view.props.style);
        expect(merged).not.toHaveProperty('containerName');
        expect(merged.width).toBe(200);
      });

      it('keeps a function-form user style on a container on the dynamic path', () => {
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
        expect(merged).not.toHaveProperty('containerName');
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

    it('detects the leaf through Animated wrappers (lift applies, no warn)', () => {
      // Animated.createAnimatedComponent names the wrapper `Animated(Text)`;
      // the validOn check must see the inner Text, not the wrapper name.
      const Clamped = styled(Animated.Text as any)`
        line-clamp: 2;
      `;
      const warnSpy2 = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const tree = TestRenderer.create(<Clamped>long text</Clamped>);
        const el = tree.root.findByType(Animated.Text as any);
        expect(el.props.numberOfLines).toBe(2);
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

    it('warns once and skips the lift when line-clamp is applied to a non-Text element', () => {
      const warnSpy2 = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const Bad = styled.View`
          line-clamp: 2;
        `;
        const tree = TestRenderer.create(<Bad />);
        tree.update(<Bad />);
        const view = tree.root.findByType(View);
        expect(view.props.numberOfLines).toBeUndefined();
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

describe('interpolation evaluation on every render (#5788)', () => {
  // An interpolation may call a React hook (MUI X DataGrid reads a grid selector
  // via `useContext` inside one) or read state outside props and theme. That
  // hook is one of the component's hooks and must run every render; a props-equal
  // cache that skipped the interpolation dropped the hook (React "Rendered fewer
  // hooks than expected" crash) and served stale styles. A context-driven
  // re-render leaves the component's own props unchanged, so it exercises the
  // path a props-equal cache treated as a hit.
  it('runs a hook called inside an interpolation across a context-driven re-render', () => {
    const ColorContext = React.createContext('red');
    const Comp = styled(View)`
      background-color: ${() => React.useContext(ColorContext)};
    `;

    function App({ color }: { color: string }) {
      return (
        <ColorContext.Provider value={color}>
          <Comp />
        </ColorContext.Provider>
      );
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      renderer = TestRenderer.create(<App color="red" />);
    });
    expect(mergeStyle(renderer.root.findByType(View).props.style).backgroundColor).toBe('red');

    expect(() => {
      TestRenderer.act(() => {
        renderer.update(<App color="blue" />);
      });
    }).not.toThrow();
    expect(mergeStyle(renderer.root.findByType(View).props.style).backgroundColor).toBe('blue');

    TestRenderer.act(() => renderer.unmount());
  });

  it('updates the resolved style when an interpolation reads changed external state', () => {
    const SizeContext = React.createContext(10);
    const Comp = styled(View)`
      padding-top: ${() => React.useContext(SizeContext)}px;
    `;

    function App({ size }: { size: number }) {
      return (
        <SizeContext.Provider value={size}>
          <Comp />
        </SizeContext.Provider>
      );
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      renderer = TestRenderer.create(<App size={10} />);
    });
    expect(mergeStyle(renderer.root.findByType(View).props.style).paddingTop).toBe(10);

    TestRenderer.act(() => {
      renderer.update(<App size={20} />);
    });
    expect(mergeStyle(renderer.root.findByType(View).props.style).paddingTop).toBe(20);

    TestRenderer.act(() => renderer.unmount());
  });
});

describe('interpolation of a value with a text form', () => {
  it('reads an instance with its own toString and a bigint as their text', () => {
    class Length {
      toString() {
        return '10px';
      }
    }
    const Comp = styled(View)`
      padding-top: ${new Length()};
      z-index: ${BigInt(3)};
    `;

    const renderer = TestRenderer.create(<Comp />);

    expect(mergeStyle(renderer.root.findByType(View).props.style)).toEqual({
      paddingTop: 10,
      zIndex: 3,
    });
  });
});

describe('a plain string value stays in its declaration', () => {
  it.each<[string, string, Record<string, unknown>]>([
    ['a paren it leaves open', '(', { left: 0 }],
    ['a string it leaves open', '"', { left: 0 }],
    ['a brace it never closes', '{', { left: 0 }],
    ['a brace it did not open', '}', { left: 0 }],
    ['a comment it leaves open', 'red /*', { color: 'red', left: 0 }],
  ])('keeps the declarations after %s', (_label, value, expected) => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const Direct = styled(View)`color: ${value}; left: 0;`;
      const FromFunction = styled(View)`color: ${() => value}; left: 0;`;

      const direct = TestRenderer.create(<Direct />);
      const fromFunction = TestRenderer.create(<FromFunction />);

      expect(mergeStyle(direct.root.findByType(View).props.style)).toEqual(expected);
      expect(mergeStyle(fromFunction.root.findByType(View).props.style)).toEqual(expected);
    } finally {
      warn.mockRestore();
    }
  });
});

// A mount count above the expected one means the library moved the user's elements to a new
// place in the tree (React unmounts and remounts anything whose place changed).
describe('tree shape stability', () => {
  /** Counts mounts of its instances: a state initializer runs once per mount. */
  function mountCounter() {
    const counter = { mounts: 0 };
    function Leaf() {
      React.useState(() => {
        counter.mounts++;
        return 0;
      });
      return <View />;
    }
    return { counter, Leaf };
  }

  /** React's own dev warning for a lone generator child, raised once by React and by no walk of ours. */
  function expectOnlyReactIteratorWarning(spy: jest.SpyInstance) {
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain('Using Iterators as children is unsupported');
  }

  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('keeps a plain sibling mounted while a styled sibling appears and leaves before it', () => {
    const { counter, Leaf } = mountCounter();
    const Form = styled.View``;
    const ErrorText = styled.Text``;
    const render = (error: boolean) => (
      <Form>
        {error && <ErrorText>invalid</ErrorText>}
        <Leaf />
      </Form>
    );

    const tree = TestRenderer.create(render(false));
    tree.update(render(true));
    tree.update(render(false));

    expect(counter.mounts).toBe(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('keeps a keyed list mounted while a styled sibling appears before it', () => {
    const { counter, Leaf } = mountCounter();
    const Form = styled.View``;
    const Header = styled.Text``;
    const render = (header: boolean) => (
      <Form>
        {header && <Header>title</Header>}
        {['a', 'b', 'c'].map(id => (
          <Leaf key={id} />
        ))}
      </Form>
    );

    const tree = TestRenderer.create(render(false));
    tree.update(render(true));

    expect(counter.mounts).toBe(3);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('keeps a plain sibling and the kept rows mounted while a mapped list of styled rows grows and shrinks', () => {
    const lead = mountCounter();
    const row = mountCounter();
    const Form = styled.View``;
    const Row = styled.View``;
    const render = (ids: string[]) => (
      <Form>
        <lead.Leaf />
        {ids.map(id => (
          <Row key={id}>
            <row.Leaf />
          </Row>
        ))}
      </Form>
    );

    const tree = TestRenderer.create(render([]));
    tree.update(render(['a', 'b']));
    tree.update(render(['a']));

    expect(lead.counter.mounts).toBe(1);
    expect(row.counter.mounts).toBe(2);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('keeps keyed styled rows mounted when they reorder', () => {
    const row = mountCounter();
    const Form = styled.View``;
    const Row = styled.View``;
    const render = (ids: string[]) => (
      <Form>
        {ids.map(id => (
          <Row key={id}>
            <row.Leaf />
          </Row>
        ))}
      </Form>
    );

    const tree = TestRenderer.create(render(['a', 'b']));
    tree.update(render(['b', 'a']));

    expect(row.counter.mounts).toBe(2);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('keeps an unkeyed styled child at its position while the siblings before it come and go', () => {
    const last = mountCounter();
    const Form = styled.View``;
    const Row = styled.View``;
    const render = (middle: boolean) => (
      <Form>
        <Row />
        {middle && <Row />}
        <Row>
          <last.Leaf />
        </Row>
      </Form>
    );

    const tree = TestRenderer.create(render(false));
    tree.update(render(true));
    tree.update(render(false));

    expect(last.counter.mounts).toBe(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('raises no missing-key warning for two or more static children', () => {
    const Form = styled.View``;
    const Row = styled.View``;
    const Plain = () => <View />;
    const render = (testID: string) => (
      <Form testID={testID}>
        <Row />
        <Plain />
        <Row />
        text
      </Form>
    );

    const tree = TestRenderer.create(render('one'));
    tree.update(render('two'));

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('renders the elements of a generator child as React renders them', () => {
    const { counter, Leaf } = mountCounter();
    const Form = styled.View``;
    function* items() {
      yield <Leaf key="g" />;
    }

    TestRenderer.create(<Form>{items()}</Form>);

    expect(counter.mounts).toBe(1);
    expectOnlyReactIteratorWarning(errorSpy);
  });

  it('renders the elements of a generator child under a :has() parent', () => {
    const { counter, Leaf } = mountCounter();
    const Marker = styled.View``;
    const Form = styled.View`
      padding-top: 1px;
      &:has(${Marker}) {
        padding-top: 2px;
      }
    `;
    function* items() {
      yield <Leaf key="g" />;
    }

    const tree = TestRenderer.create(
      <Form>
        <Marker />
        {items()}
      </Form>
    );

    expect(counter.mounts).toBe(1);
    expect(mergeStyle(tree.root.findAllByType(View)[0].props.style)).toEqual({ paddingTop: 2 });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('renders function children of a styled Pressable once and keeps them mounted', () => {
    const { counter, Leaf } = mountCounter();
    const Press = styled(Pressable)``;
    const render = (testID: string) => <Press testID={testID}>{() => <Leaf />}</Press>;

    const tree = TestRenderer.create(render('one'));
    tree.update(render('two'));

    expect(counter.mounts).toBe(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  describe('a font size, line height or direction appearing and leaving', () => {
    it('keeps a child mounted while a font-size declared only inside @media turns on and off', () => {
      const { counter, Leaf } = mountCounter();
      const Form = styled.View`
        @media (min-width: 1000px) {
          font-size: 20px;
        }
      `;
      // The subscription is made once per cache; reset it so this mount makes it under the spy.
      resetResponsiveCache();
      const changeSpy = jest.spyOn(Dimensions, 'addEventListener');
      const resize = (width: number) =>
        TestRenderer.act(() => {
          const listener = changeSpy.mock.calls.find(c => c[0] === 'change')?.[1];
          listener!({
            window: { width, height: 800, scale: 2, fontScale: 1 },
            screen: { width, height: 800, scale: 2, fontScale: 1 },
          } as any);
        });

      try {
        TestRenderer.create(
          <Form>
            <Leaf />
          </Form>
        );
        resize(1200);
        resize(750);

        expect(counter.mounts).toBe(1);
        expect(errorSpy).not.toHaveBeenCalled();
      } finally {
        changeSpy.mockRestore();
        resetResponsiveCache();
      }
    });

    it.each([
      ['an object', { fontSize: 20 }],
      ['an object holding another key', { opacity: 0.5 }],
    ])('keeps a child mounted while a caller style of %s appears and leaves', (_name, style) => {
      const { counter, Leaf } = mountCounter();
      const Form = styled.View`
        ${forceDynamic}
      `;
      const render = (next?: object) => (
        <Form style={next}>
          <Leaf />
        </Form>
      );

      const tree = TestRenderer.create(render());
      tree.update(render(style));
      tree.update(render());

      expect(counter.mounts).toBe(1);
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('keeps a child mounted while an interpolated custom property appears and leaves', () => {
      const { counter, Leaf } = mountCounter();
      const Form = styled.View<{ $on: boolean }>`
        ${p => (p.$on ? '--s: 20px;' : '')}
      `;
      const render = (on: boolean) => (
        <Form $on={on}>
          <Leaf />
        </Form>
      );

      const tree = TestRenderer.create(render(false));
      tree.update(render(true));
      tree.update(render(false));

      expect(counter.mounts).toBe(1);
      expect(errorSpy).not.toHaveBeenCalled();
    });

    describe('on a styled Pressable', () => {
      const Press = styled(Pressable)`
        ${forceDynamic}
      `;
      const PressByActive = styled(Pressable)`
        &:active {
          font-size: 20px;
        }
      `;
      const byState = (state: { pressed?: boolean }) => ({ fontSize: state.pressed ? 30 : 20 });

      it('keeps a child mounted while the style is an object, then a function, then an object', () => {
        const { counter, Leaf } = mountCounter();
        const render = (style: unknown) => (
          <Press style={style as object}>
            <Leaf />
          </Press>
        );

        const tree = TestRenderer.create(render({ fontSize: 20 }));
        tree.update(render(byState));
        tree.update(render({ fontSize: 20 }));

        expect(counter.mounts).toBe(1);
        expect(errorSpy).not.toHaveBeenCalled();
      });

      it('keeps a child mounted while the Pressable is pressed and released', () => {
        const { counter, Leaf } = mountCounter();
        const render = (pressed: boolean) => (
          <PressByActive testOnly_pressed={pressed}>
            <Leaf />
          </PressByActive>
        );

        const tree = TestRenderer.create(render(false));
        tree.update(render(true));
        tree.update(render(false));

        expect(counter.mounts).toBe(1);
        expect(errorSpy).not.toHaveBeenCalled();
      });

      it('keeps matching :nth-child by JSX position under a function style', () => {
        const Row = styled.View`
          &:nth-child(2) {
            opacity: 0.5;
          }
        `;

        const tree = TestRenderer.create(
          <Press style={byState}>
            <Row />
            <Row />
          </Press>
        );

        const rows = tree.root.findAllByType(View).slice(-2);
        expect(rows.map(row => mergeStyle(row.props.style))).toEqual([{}, { opacity: 0.5 }]);
      });
    });
  });
});

describe('a styled child of a target that clones its only child', () => {
  // A released TouchableHighlight hides its underlay on a timer; run it inside the test, not after it.
  beforeEach(() => jest.useFakeTimers());

  afterEach(() => {
    TestRenderer.act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  const touchables = [
    ['TouchableWithoutFeedback', TouchableWithoutFeedback],
    ['TouchableHighlight', TouchableHighlight],
    ['TouchableNativeFeedback', TouchableNativeFeedback],
  ] as const;

  /**
   * A touch lands on the deepest ancestor of `leaf` that claims the responder,
   * the way React Native's touch system picks it. A tree with no claimant takes
   * no touch: `down` and `up` do nothing.
   */
  function touchFrom(leaf: TestRenderer.ReactTestInstance) {
    let responder = leaf.parent;
    while (responder !== null && typeof responder.props.onStartShouldSetResponder !== 'function') {
      responder = responder.parent;
    }
    // The responder region is measured on grant, so the target needs a native node's `measure`.
    const nativeNode = {
      measure: (done: (...frame: number[]) => void) => done(0, 0, 100, 100, 0, 0),
    };
    const event = {
      currentTarget: nativeNode,
      nativeEvent: { timestamp: 0, touches: [] },
      persist: () => {},
      target: nativeNode,
    };
    return {
      down: () => TestRenderer.act(() => responder?.props.onResponderGrant(event)),
      up: () => TestRenderer.act(() => responder?.props.onResponderRelease(event)),
    };
  }

  function pressFrom(leaf: TestRenderer.ReactTestInstance) {
    const touch = touchFrom(leaf);
    touch.down();
    touch.up();
  }

  const labelOf = (tree: TestRenderer.ReactTestRenderer) =>
    tree.root.findByProps({ testID: 'label' });

  it.each(touchables)(
    'calls the onPress of a styled %s when its single styled child is pressed',
    (_name, Touchable) => {
      const onPress = jest.fn();
      const Target = styled(Touchable as React.ComponentType<any>)``;
      const Child = styled.View``;

      const tree = TestRenderer.create(
        <Target onPress={onPress}>
          <Child>
            <Text testID="label">go</Text>
          </Child>
        </Target>
      );
      pressFrom(labelOf(tree));

      expect(onPress).toHaveBeenCalledTimes(1);
    }
  );

  it.each(touchables)(
    'calls the onPress of a styled %s when its single plain child is pressed',
    (_name, Touchable) => {
      const onPress = jest.fn();
      const Target = styled(Touchable as React.ComponentType<any>)``;

      const tree = TestRenderer.create(
        <Target onPress={onPress}>
          <View>
            <Text testID="label">go</Text>
          </View>
        </Target>
      );
      pressFrom(labelOf(tree));

      expect(onPress).toHaveBeenCalledTimes(1);
    }
  );

  it.each(touchables)(
    'calls the onPress of an unstyled %s when its single styled child is pressed',
    (_name, Touchable) => {
      const onPress = jest.fn();
      const Child = styled.View``;
      const Plain = Touchable as React.ComponentType<any>;

      const tree = TestRenderer.create(
        <Plain onPress={onPress}>
          <Child>
            <Text testID="label">go</Text>
          </Child>
        </Plain>
      );
      pressFrom(labelOf(tree));

      expect(onPress).toHaveBeenCalledTimes(1);
    }
  );

  it('gives the single styled child of a styled TouchableHighlight the pressed opacity', () => {
    const Target = styled(TouchableHighlight)``;
    const Child = styled.View`
      padding-top: 4px;
    `;
    const childStyle = (tree: TestRenderer.ReactTestRenderer) =>
      mergeStyle(
        tree.root.find(node => node.type === View && node.props.testID === 'child').props.style
      );

    const tree = TestRenderer.create(
      <Target onPress={() => {}}>
        <Child testID="child">
          <Text testID="label">go</Text>
        </Child>
      </Target>
    );
    expect(childStyle(tree)).toEqual({ paddingTop: 4 });

    // Press in and hold: the child carries the touchable's activeOpacity (0.85 by default).
    const touch = touchFrom(labelOf(tree));
    touch.down();
    expect(childStyle(tree)).toEqual({ opacity: 0.85, paddingTop: 4 });

    touch.up();
  });

  it('lays out the styled child a sticky header clones', () => {
    // The jest preset mocks ScrollView without sticky headers; the real one wraps each sticky index in ScrollViewStickyHeader.
    const RealScrollView: React.ComponentType<any> = jest.requireActual(
      'react-native/Libraries/Components/ScrollView/ScrollView'
    ).default;
    const Scroller = styled(RealScrollView)``;
    const Header = styled.View``;
    const onLayout = jest.fn();
    const event = { nativeEvent: { layout: { height: 10, width: 100, x: 0, y: 0 } } };

    const tree = TestRenderer.create(
      <Scroller stickyHeaderIndices={[0]}>
        <Header onLayout={onLayout} testID="header" />
        <View />
      </Scroller>
    );
    // The sticky header is the nearest ancestor of the header whose onLayout is not the header's own.
    let stickyHeader = tree.root.find(node => node.props.testID === 'header').parent;
    while (stickyHeader !== null && stickyHeader.props.onLayout === undefined) {
      stickyHeader = stickyHeader.parent;
    }
    TestRenderer.act(() => stickyHeader?.props.onLayout(event));

    expect(onLayout).toHaveBeenCalledTimes(1);
  });

  describe('sibling position', () => {
    const Marked = styled.View`
      color: black;
      &:first-child {
        color: red;
      }
    `;

    /** The styled-component wrapper a HOC returns: statics hoisted, props forwarded or not. */
    function hoistedFrom(Inner: typeof Marked, forwardProps: boolean) {
      const Wrapper = (props: object) => <Inner {...(forwardProps ? props : {})} />;
      return hoistNonReactStatics(Wrapper, Inner) as unknown as typeof Marked;
    }

    it('matches :first-child through a HOC that hoists statics and forwards props', () => {
      const Wrapped = hoistedFrom(Marked, true);
      const Parent = styled.View``;

      const tree = TestRenderer.create(
        <Parent>
          <Wrapped testID="wrapped" />
        </Parent>
      );
      const host = tree.root.find(node => node.type === View && node.props.testID === 'wrapped');

      expect(mergeStyle(host.props.style).color).toBe('red');
    });

    it('renders through a HOC that hoists statics and drops props', () => {
      const Wrapped = hoistedFrom(Marked, false);
      const Parent = styled.View``;

      const tree = TestRenderer.create(
        <Parent>
          <Wrapped />
          <Wrapped />
        </Parent>
      );

      expect(tree.root.findAllByType(View)).toHaveLength(3);
    });

    it('matches :first-child and :only-child on the single styled child of a styled TouchableHighlight', () => {
      const Target = styled(TouchableHighlight)``;
      const Child = styled.View`
        &:first-child {
          padding-top: 8px;
        }
        &:only-child {
          margin-top: 2px;
        }
      `;

      const tree = TestRenderer.create(
        <Target onPress={() => {}}>
          <Child testID="child" />
        </Target>
      );
      const host = tree.root.find(node => node.type === View && node.props.testID === 'child');

      expect(mergeStyle(host.props.style)).toEqual({ marginTop: 2, paddingTop: 8 });
    });

    it('matches `${Card} + &` and :nth-child(2) under a styled target that clones each child', () => {
      const CloneEach = ({ children }: PropsWithChildren) => (
        <View>{React.Children.map(children, child => React.cloneElement(child as never))}</View>
      );
      const Target = styled(CloneEach)``;
      const Card = styled.View``;
      const Next = styled.View`
        ${Card} + & {
          color: red;
        }
        &:nth-child(2) {
          margin-top: 2px;
        }
      `;

      const tree = TestRenderer.create(
        <Target>
          <Card testID="card" />
          <Next testID="next" />
        </Target>
      );
      const host = (id: string) =>
        tree.root.find(node => node.type === View && node.props.testID === id);

      expect(mergeStyle(host('card').props.style)).toEqual({});
      expect(mergeStyle(host('next').props.style)).toEqual({ color: 'red', marginTop: 2 });
    });

    it("gives useParentContext the parent's published value inside a styled child, not the child's position", () => {
      const seen: ParentContextValue[] = [];
      const Parent = styled.View``;
      const Child = styled.View`
        color: ${() => {
          seen.push(useParentContext());
          return 'red';
        }};
      `;

      TestRenderer.create(
        <Parent>
          <View />
          <Child />
        </Parent>
      );

      expect(seen).toHaveLength(1);
      expect(seen[0]).toMatchObject({
        parentId: Parent.styledComponentId,
        prevSiblingId: null,
        siblingIndex: -1,
        totalSiblings: 0,
      });
    });
  });

  describe('the parent slot prop', () => {
    const received: Array<Record<string, unknown>> = [];
    const Probe = (props: Record<string, unknown>) => {
      received.push(props);
      return <View />;
    };
    const Parent = styled.View``;

    beforeEach(() => {
      received.length = 0;
    });

    it('never reaches the target of a static styled child', () => {
      const Child = styled(Probe as React.ComponentType<any>)`
        padding-top: 4px;
      `;
      expect(Child.nativeStyle.staticEligible).toBe(true);

      TestRenderer.create(
        <Parent>
          <Child testID="child" />
        </Parent>
      );

      expect(received.map(props => PARENT_SLOT_PROP in props)).toEqual([false]);
      expect(received[0].testID).toBe('child');
    });

    it('never reaches attrs, an interpolation, shouldForwardProp or the target of a dynamic styled child', () => {
      const attrsProps: Array<Record<string, unknown>> = [];
      const interpolationProps: Array<Record<string, unknown>> = [];
      const forwarded: string[] = [];
      const Child = styled(Probe as React.ComponentType<any>)
        .withConfig({
          shouldForwardProp: prop => {
            forwarded.push(prop);
            return true;
          },
        })
        .attrs((props: Record<string, unknown>) => {
          attrsProps.push(props);
          return {};
        })`
        color: ${(props: Record<string, unknown>) => {
          interpolationProps.push(props);
          return 'blue';
        }};
        &:first-child {
          color: red;
        }
      `;
      expect(Child.nativeStyle.staticEligible).toBe(false);

      TestRenderer.create(
        <Parent>
          <Child testID="child" />
        </Parent>
      );

      expect(attrsProps.map(props => PARENT_SLOT_PROP in props)).toEqual([false]);
      expect(interpolationProps.map(props => PARENT_SLOT_PROP in props)).toEqual([false]);
      expect(forwarded).not.toContain(PARENT_SLOT_PROP);
      expect(received.map(props => PARENT_SLOT_PROP in props)).toEqual([false]);
      // The position it carried was still read.
      expect(mergeStyle(received[0].style).color).toBe('red');
    });
  });
});
