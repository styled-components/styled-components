import React from 'react';
import {
  Appearance,
  Pressable,
  StyleSheet,
  Text,
  TouchableHighlight,
  TouchableNativeFeedback,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import TestRenderer from 'react-test-renderer';
import { toNativeStyles } from '../../models/compileNative';
import { hasWarned, warnKey } from '../../utils/warnOnce';
import styled from '../index';
import { applyBackgroundBlendModePolyfill, applyStylePolyfills } from '../polyfills';
import { resetResponsiveCache } from '../responsive';
import { resetWarningsForTest } from '../transform/dev';

// ──────────────────────────────────────────────────────────────────
//  applyBackgroundBlendModePolyfill
// ──────────────────────────────────────────────────────────────────

/** The user's children ride in the second slot behind a keyed Fragment, so they keep one fiber whatever the layers do. */
function expectKeyedChildren(slot: unknown, children: React.ReactNode) {
  const fragment = slot as React.ReactElement<{ children: React.ReactNode }>;
  expect(fragment.type).toBe(React.Fragment);
  expect(fragment.key).toBe('__sc_bg_children');
  expect(fragment.props.children).toBe(children);
}

describe('applyBackgroundBlendModePolyfill (pure)', () => {
  /** The layers sit in the first slot of `[layers, children]`, ahead of the user's children. */
  function layersIn(out: Record<string, unknown>): React.ReactElement[] {
    return (out.children as [React.ReactElement[], React.ReactNode])[0];
  }

  function gather(out: Record<string, unknown>): React.ReactElement[] {
    return layersIn(out).filter(c => c && (c as { key: unknown }).key);
  }

  it('returns the same reference when style has no backgroundBlendMode', () => {
    const props = { style: { width: 10, backgroundColor: 'red' }, children: null };
    expect(applyBackgroundBlendModePolyfill(props)).toBe(props);
  });

  it('returns the same reference when backgroundBlendMode has no companion image', () => {
    const props = {
      style: { backgroundColor: 'red', backgroundBlendMode: 'multiply' },
      children: null,
    };
    expect(applyBackgroundBlendModePolyfill(props)).toBe(props);
  });

  it('synthesizes one layer for single gradient + single blend mode', () => {
    const props = {
      style: {
        width: 100,
        height: 100,
        backgroundColor: 'red',
        experimental_backgroundImage: 'linear-gradient(transparent, black)',
        backgroundImage: 'linear-gradient(transparent, black)',
        backgroundBlendMode: 'multiply',
      },
      children: null,
    };
    const out = applyBackgroundBlendModePolyfill(props);
    expect(out).not.toBe(props);

    const wrapperStyle = out.style as Record<string, unknown>;
    // bgColor is lifted out of the wrapper into a sibling View so iOS's
    // CALayer.compositingFilter has a normal-stacking-order backdrop to
    // composite against.
    expect(wrapperStyle.backgroundColor).toBeUndefined();
    expect(wrapperStyle.width).toBe(100);
    expect(wrapperStyle.height).toBe(100);
    expect(wrapperStyle.isolation).toBe('isolate');
    expect(wrapperStyle.experimental_backgroundImage).toBeUndefined();
    expect(wrapperStyle.backgroundImage).toBeUndefined();
    expect(wrapperStyle.backgroundBlendMode).toBeUndefined();

    const layers = gather(out);
    expect(layers).toHaveLength(2);

    // Bottom layer: the bgColor backdrop.
    const bgLayer = layers[0];
    expect(bgLayer.key).toBe('__sc_bg_blend_color');
    const bgLayerStyle = (bgLayer.props as { style: Record<string, unknown> }).style;
    expect(bgLayerStyle.backgroundColor).toBe('red');
    expect(bgLayerStyle.position).toBe('absolute');

    // Blend layer: the gradient with mixBlendMode.
    const blendLayer = layers[1];
    const blendLayerStyle = (blendLayer.props as { style: Record<string, unknown> }).style;
    expect(blendLayerStyle.position).toBe('absolute');
    expect(blendLayerStyle.top).toBe(0);
    expect(blendLayerStyle.left).toBe(0);
    expect(blendLayerStyle.right).toBe(0);
    expect(blendLayerStyle.bottom).toBe(0);
    expect(blendLayerStyle.experimental_backgroundImage).toBe(
      'linear-gradient(transparent, black)'
    );
    expect(blendLayerStyle.backgroundImage).toBe('linear-gradient(transparent, black)');
    expect(blendLayerStyle.mixBlendMode).toBe('multiply');
    expect((blendLayer.props as { pointerEvents: string }).pointerEvents).toBe('none');
  });

  it('preserves user children after the injected layers', () => {
    const userChild = React.createElement('Text', { key: 'user-1' }, 'hello');
    const props = {
      style: {
        backgroundColor: 'red',
        experimental_backgroundImage: 'linear-gradient(transparent, black)',
        backgroundBlendMode: 'multiply',
      },
      children: userChild,
    };
    const out = applyBackgroundBlendModePolyfill(props);
    const [layers, children] = out.children as [React.ReactElement[], React.ReactNode];
    expect(layers).toHaveLength(2);
    expect(layers[0].key).toBe('__sc_bg_blend_color');
    expect(layers[1].key).toBe('__sc_bg_blend_0');
    expectKeyedChildren(children, userChild);
  });

  it('orders multi-layer blends per CSS spec (first comma on top)', () => {
    const props = {
      style: {
        backgroundColor: 'white',
        experimental_backgroundImage:
          'linear-gradient(red, transparent), linear-gradient(blue, transparent)',
        backgroundBlendMode: 'multiply, screen',
      },
      children: null,
    };
    const out = applyBackgroundBlendModePolyfill(props);
    const layers = gather(out);
    // bg-color sibling + 2 gradient layers
    expect(layers).toHaveLength(3);
    expect(layers[0].key).toBe('__sc_bg_blend_color');
    // Last gradient layer (i=1) pushed first → DOM-second → bottom of the blend stack.
    // First gradient layer (i=0) pushed last → DOM-last → top of the stack.
    const bottom = (layers[1].props as { style: Record<string, unknown> }).style;
    const top = (layers[2].props as { style: Record<string, unknown> }).style;
    expect(bottom.experimental_backgroundImage).toBe('linear-gradient(blue, transparent)');
    expect(bottom.mixBlendMode).toBe('screen');
    expect(top.experimental_backgroundImage).toBe('linear-gradient(red, transparent)');
    expect(top.mixBlendMode).toBe('multiply');
  });

  it('cycles blend modes when fewer than image layers (CSS shorthand semantics)', () => {
    const props = {
      style: {
        backgroundColor: 'white',
        experimental_backgroundImage:
          'linear-gradient(a, b), linear-gradient(c, d), linear-gradient(e, f)',
        backgroundBlendMode: 'multiply',
      },
      children: null,
    };
    const out = applyBackgroundBlendModePolyfill(props);
    const layers = gather(out);
    // bg-color sibling + 3 gradient layers
    expect(layers).toHaveLength(4);
    expect(layers[0].key).toBe('__sc_bg_blend_color');
    layers.slice(1).forEach(layer => {
      const style = (layer.props as { style: Record<string, unknown> }).style;
      expect(style.mixBlendMode).toBe('multiply');
    });
  });

  it('flattens array-form style', () => {
    const props = {
      style: [
        { backgroundColor: 'red' },
        {
          experimental_backgroundImage: 'linear-gradient(black, white)',
          backgroundBlendMode: 'screen',
        },
      ],
      children: null,
    };
    const out = applyBackgroundBlendModePolyfill(props);
    expect(out).not.toBe(props);
    const wrapperStyle = out.style as Record<string, unknown>;
    expect(wrapperStyle.backgroundColor).toBeUndefined();
    expect(wrapperStyle.isolation).toBe('isolate');
    expect(wrapperStyle.experimental_backgroundImage).toBeUndefined();

    const layers = gather(out);
    const bgLayer = layers[0];
    expect(bgLayer.key).toBe('__sc_bg_blend_color');
    expect((bgLayer.props as { style: Record<string, unknown> }).style.backgroundColor).toBe('red');
  });

  it('passes through function-form style (Pressable callback) untouched', () => {
    const fn = () => ({});
    const props = { style: fn, children: null };
    expect(applyBackgroundBlendModePolyfill(props)).toBe(props);
  });

  describe('layer slot', () => {
    const userChild = React.createElement('Text', { key: 'user-1' }, 'hello');

    it.each<[string, Record<string, unknown>]>([
      ['no backgroundBlendMode', { width: 10 }],
      [
        'a backgroundBlendMode with no companion image',
        { backgroundColor: 'red', backgroundBlendMode: 'multiply' },
      ],
    ])(
      'nests the children behind an empty layer slot when asked for one with %s',
      (_label, style) => {
        const props = { style, children: userChild };
        const out = applyBackgroundBlendModePolyfill(props, true);
        expect(out.style).toBe(style);
        const [layers, children] = out.children as [null, React.ReactNode];
        expect(layers).toBeNull();
        expectKeyedChildren(children, userChild);
      }
    );

    it('returns the same reference when no slot is asked for and no layer applies', () => {
      const props = { style: { width: 10 }, children: userChild };
      expect(applyBackgroundBlendModePolyfill(props, false)).toBe(props);
    });

    it.each<[string, boolean]>([
      ['with a slot requested', true],
      ['without a slot requested', false],
    ])('nests the layers ahead of the user children, not spread, %s', (_label, slot) => {
      const props = {
        style: {
          backgroundColor: 'red',
          experimental_backgroundImage: 'linear-gradient(transparent, black)',
          backgroundBlendMode: 'multiply',
        },
        children: userChild,
      };
      const out = applyBackgroundBlendModePolyfill(props, slot);
      const [layers, children] = out.children as [React.ReactElement[], React.ReactNode];
      expect(layers.map(layer => layer.key)).toEqual(['__sc_bg_blend_color', '__sc_bg_blend_0']);
      expectKeyedChildren(children, userChild);
    });
  });

  describe('url() photo layers', () => {
    /** Read the inner Image element from a wrapping View blend layer. */
    function readPhoto(wrapper: React.ReactElement): React.ReactElement<{
      source: { uri: string };
      resizeMode: string;
      style: Record<string, unknown>;
    }> {
      return (wrapper.props as { children: React.ReactElement }).children;
    }

    it('renders a View > Image wrapper with mixBlendMode on the View', () => {
      const props = {
        style: {
          backgroundColor: 'red',
          experimental_backgroundImage: 'url(https://example.com/dog.jpg)',
          backgroundBlendMode: 'multiply',
        },
        children: null,
      };
      const out = applyBackgroundBlendModePolyfill(props);
      const layers = gather(out);
      // bg-color sibling + photo wrapper View
      expect(layers).toHaveLength(2);
      expect(layers[0].key).toBe('__sc_bg_blend_color');

      const wrapper = layers[1];
      const wrapperStyle = (wrapper.props as { style: Record<string, unknown> }).style;
      expect(wrapperStyle.position).toBe('absolute');
      expect(wrapperStyle.mixBlendMode).toBe('multiply');
      expect(wrapperStyle.overflow).toBe('hidden');

      const photo = readPhoto(wrapper);
      expect(photo.props.source).toEqual({ uri: 'https://example.com/dog.jpg' });
      expect(photo.props.resizeMode).toBe('cover');
    });

    it('strips single quotes from url() syntax', () => {
      const props = {
        style: {
          backgroundColor: 'red',
          experimental_backgroundImage: "url('https://example.com/dog.jpg')",
          backgroundBlendMode: 'multiply',
        },
        children: null,
      };
      const out = applyBackgroundBlendModePolyfill(props);
      const wrapper = layersIn(out)[1];
      expect(readPhoto(wrapper).props.source.uri).toBe('https://example.com/dog.jpg');
    });

    it('strips double quotes from url() syntax', () => {
      const props = {
        style: {
          backgroundColor: 'red',
          experimental_backgroundImage: 'url("https://example.com/dog.jpg")',
          backgroundBlendMode: 'multiply',
        },
        children: null,
      };
      const out = applyBackgroundBlendModePolyfill(props);
      const wrapper = layersIn(out)[1];
      expect(readPhoto(wrapper).props.source.uri).toBe('https://example.com/dog.jpg');
    });

    it('mixes url() and gradient layers in the same blend stack', () => {
      const props = {
        style: {
          backgroundColor: 'red',
          experimental_backgroundImage:
            'linear-gradient(transparent, #000), url(https://example.com/dog.jpg)',
          backgroundBlendMode: 'multiply, screen',
        },
        children: null,
      };
      const out = applyBackgroundBlendModePolyfill(props);
      const layers = gather(out);
      // bg-color sibling + 2 blend layers (photo wrapper + gradient)
      expect(layers).toHaveLength(3);
      expect(layers[0].key).toBe('__sc_bg_blend_color');
      // Bottom blend layer (i=1, last comma) is the photo wrapper with screen.
      const photoWrapper = layers[1];
      const photoStyle = (photoWrapper.props as { style: Record<string, unknown> }).style;
      expect(photoStyle.mixBlendMode).toBe('screen');
      expect(readPhoto(photoWrapper).props.source.uri).toBe('https://example.com/dog.jpg');
      // Top blend layer (i=0, first comma) is the gradient with multiply.
      const top = layers[2] as React.ReactElement<{ style: Record<string, unknown> }>;
      expect(top.props.style.experimental_backgroundImage).toBe(
        'linear-gradient(transparent, #000)'
      );
      expect(top.props.style.mixBlendMode).toBe('multiply');
    });

    it('honors background-size: contain on photo layers', () => {
      const props = {
        style: {
          backgroundColor: 'red',
          experimental_backgroundImage: 'url(https://example.com/dog.jpg)',
          backgroundSize: 'contain',
          backgroundBlendMode: 'multiply',
        },
        children: null,
      };
      const out = applyBackgroundBlendModePolyfill(props);
      const wrapper = layersIn(out)[1];
      expect(readPhoto(wrapper).props.resizeMode).toBe('contain');
    });
  });

  describe('background-color lifting', () => {
    it('skips lifting when no backgroundColor is set', () => {
      const props = {
        style: {
          experimental_backgroundImage: 'linear-gradient(black, white)',
          backgroundBlendMode: 'multiply',
        },
        children: null,
      };
      const out = applyBackgroundBlendModePolyfill(props);
      const layers = gather(out);
      expect(layers).toHaveLength(1);
      expect(layers[0].key).toBe('__sc_bg_blend_0');
    });

    it('skips lifting when backgroundColor is "transparent"', () => {
      const props = {
        style: {
          backgroundColor: 'transparent',
          experimental_backgroundImage: 'linear-gradient(black, white)',
          backgroundBlendMode: 'multiply',
        },
        children: null,
      };
      const out = applyBackgroundBlendModePolyfill(props);
      const layers = gather(out);
      expect(layers).toHaveLength(1);
      expect(layers[0].key).toBe('__sc_bg_blend_0');
    });
  });
});

// ──────────────────────────────────────────────────────────────────
//  applyStylePolyfills (chain entry point)
// ──────────────────────────────────────────────────────────────────

describe('applyStylePolyfills (chain)', () => {
  it('passes through unaffected props', () => {
    const props = { style: { width: 10 }, children: null };
    expect(applyStylePolyfills(props)).toBe(props);
  });

  it('applies the bg-blend polyfill via the chain', () => {
    const props = {
      style: {
        backgroundColor: 'red',
        experimental_backgroundImage: 'linear-gradient(black, white)',
        backgroundBlendMode: 'multiply',
      },
      children: null,
    };
    const out = applyStylePolyfills(props);
    expect(out).not.toBe(props);
    expect((out.style as Record<string, unknown>).isolation).toBe('isolate');
  });
});

// ──────────────────────────────────────────────────────────────────
//  End-to-end render tests
// ──────────────────────────────────────────────────────────────────

describe('background-blend-mode polyfill (rendered)', () => {
  it('renders a styled.View with synthesized blend layer + isolated wrapper', () => {
    const Card = styled(View)`
      width: 100px;
      height: 100px;
      background-color: #c8243a;
      background-image: linear-gradient(transparent, #000);
      background-blend-mode: multiply;
    `;
    const tree = TestRenderer.create(<Card />);
    const json = tree.toJSON() as {
      type: string;
      props: Record<string, unknown>;
      children: unknown;
    };

    const wrapperStyle = json.props.style as Record<string, unknown>;
    // bgColor is lifted to a sibling backdrop child.
    expect(wrapperStyle.backgroundColor).toBeUndefined();
    expect(wrapperStyle.isolation).toBe('isolate');
    expect(wrapperStyle.experimental_backgroundImage).toBeUndefined();
    expect(wrapperStyle.backgroundBlendMode).toBeUndefined();

    const children = json.children as Array<{ type: string; props: Record<string, unknown> }>;
    expect(children).toHaveLength(2);
    const bgStyle = children[0].props.style as Record<string, unknown>;
    expect(bgStyle.backgroundColor).toBe('#c8243a');
    expect(bgStyle.position).toBe('absolute');
    const blendStyle = children[1].props.style as Record<string, unknown>;
    expect(blendStyle.position).toBe('absolute');
    expect(blendStyle.experimental_backgroundImage).toBe('linear-gradient(transparent, #000)');
    expect(blendStyle.mixBlendMode).toBe('multiply');
  });

  it.each(['contain', 'cover'])(
    'sizes a url() photo layer by the authored background-size: %s',
    size => {
      const Card = styled(View)`
        background-color: red;
        background-image: url(https://example.com/dog.jpg);
        background-size: ${size};
        background-blend-mode: multiply;
      `;
      const photo = TestRenderer.create(<Card />).root.find(
        node => (node.props as { source?: unknown }).source !== undefined
      );
      expect(photo.props.resizeMode).toBe(size);
    }
  );

  it.each(['contain', 'cover'])(
    'gives a gradient layer the same size keys as an unblended view for background-size: %s',
    size => {
      const Card = styled(View)`
        background-color: red;
        background-image: linear-gradient(transparent, black);
        background-size: ${size};
        background-blend-mode: multiply;
      `;
      const layer = TestRenderer.create(<Card />).root.find(
        node =>
          (node.props as { style?: { mixBlendMode?: unknown } }).style?.mixBlendMode === 'multiply'
      );
      const { backgroundSize, experimental_backgroundSize } = layer.props.style;
      expect({ backgroundSize, experimental_backgroundSize }).toEqual({
        backgroundSize: size,
        experimental_backgroundSize: 'auto',
      });
    }
  );

  it('preserves user-rendered children alongside the blend layers', () => {
    const Card = styled(View)`
      background-color: red;
      background-image: linear-gradient(transparent, black);
      background-blend-mode: multiply;
    `;
    const tree = TestRenderer.create(
      <Card>
        <View testID="user-content" />
      </Card>
    );
    const root = tree.root;
    const userContent = root.findByProps({ testID: 'user-content' });
    expect(userContent).toBeDefined();
  });
});

// ──────────────────────────────────────────────────────────────────
//  Tree shape: the blend layer slot never moves the user's children
// ──────────────────────────────────────────────────────────────────

describe('background-blend-mode layer slot (tree shape)', () => {
  /** A child that counts how many times it mounts (state initializers run once per mount). */
  function mountCounter() {
    const counter = { mounts: 0 };
    function Leaf() {
      React.useState(() => {
        counter.mounts++;
        return 0;
      });
      return <View testID="leaf" />;
    }
    return { counter, Leaf };
  }

  const hasBlendLayer = (tree: TestRenderer.ReactTestRenderer) =>
    tree.root.findAll(node => node.props.style?.mixBlendMode === 'multiply').length > 0;

  beforeEach(() => {
    resetResponsiveCache();
  });

  it('keeps the children mounted when a color-scheme @media turns the blend on and off', () => {
    const getSpy = jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    const addSpy = jest.spyOn(Appearance, 'addChangeListener');
    try {
      const { counter, Leaf } = mountCounter();
      const Card = styled(View)`
        width: 100px;
        background-color: red;
        background-image: linear-gradient(transparent, black);
        @media (prefers-color-scheme: dark) {
          background-blend-mode: multiply;
        }
      `;
      const tree = TestRenderer.create(
        <Card>
          <Leaf />
        </Card>
      );
      const listener = addSpy.mock.calls[addSpy.mock.calls.length - 1]?.[0];
      expect(listener).toBeDefined();
      expect(hasBlendLayer(tree)).toBe(false);

      TestRenderer.act(() => {
        listener!({ colorScheme: 'dark' });
      });
      expect(hasBlendLayer(tree)).toBe(true);

      TestRenderer.act(() => {
        listener!({ colorScheme: 'light' });
      });
      expect(hasBlendLayer(tree)).toBe(false);
      expect(counter.mounts).toBe(1);
    } finally {
      getSpy.mockRestore();
      addSpy.mockRestore();
    }
  });

  it('remounts the children once when the caller style first supplies a blend mode, then keeps them', () => {
    const { counter, Leaf } = mountCounter();
    const Card = styled(View)`
      width: 100px;
      background-image: linear-gradient(transparent, black);
    `;
    const render = (blend: boolean) => (
      <Card style={blend ? { backgroundBlendMode: 'multiply' } : undefined}>
        <Leaf />
      </Card>
    );
    const tree = TestRenderer.create(render(false));
    expect(counter.mounts).toBe(1);

    tree.update(render(true));
    expect(hasBlendLayer(tree)).toBe(true);
    expect(counter.mounts).toBe(2);

    tree.update(render(false));
    expect(hasBlendLayer(tree)).toBe(false);
    expect(counter.mounts).toBe(2);

    tree.update(render(true));
    expect(hasBlendLayer(tree)).toBe(true);
    expect(counter.mounts).toBe(2);
  });

  it('keeps the children mounted when a color-scheme @media resolves a var() blend mode', () => {
    const getSpy = jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    const addSpy = jest.spyOn(Appearance, 'addChangeListener');
    try {
      const { counter, Leaf } = mountCounter();
      const Card = styled(View)`
        --m: multiply;
        width: 100px;
        background-color: red;
        background-image: linear-gradient(transparent, black);
        @media (prefers-color-scheme: dark) {
          background-blend-mode: var(--m);
        }
      `;
      const tree = TestRenderer.create(
        <Card>
          <Leaf />
        </Card>
      );
      const listener = addSpy.mock.calls[addSpy.mock.calls.length - 1]?.[0];
      expect(listener).toBeDefined();
      expect(hasBlendLayer(tree)).toBe(false);

      TestRenderer.act(() => {
        listener!({ colorScheme: 'dark' });
      });
      expect(hasBlendLayer(tree)).toBe(true);
      expect(counter.mounts).toBe(1);
    } finally {
      getSpy.mockRestore();
      addSpy.mockRestore();
    }
  });

  it.each<[string, string]>([
    ['the base', 'background-blend-mode: var(--m);'],
    ['the base with !important', 'background-blend-mode: var(--m) !important;'],
    ['a media bucket', '@media (min-width: 1px) { background-blend-mode: var(--m); }'],
    [
      'a media bucket with !important',
      '@media (min-width: 1px) { background-blend-mode: var(--m) !important; }',
    ],
    ['a pseudo bucket', '&:hover { background-blend-mode: var(--m); }'],
  ])('reserves the layer slot for a var() blend mode in %s', (_label, css) => {
    const compiled = toNativeStyles(`--m: multiply; ${css}`, StyleSheet as never);
    expect(compiled.blendLayerSlot).toBe(true);
  });

  it('reserves no layer slot without a blend mode declaration', () => {
    const compiled = toNativeStyles('--m: multiply; width: var(--w);', StyleSheet as never);
    expect(compiled.blendLayerSlot).toBeUndefined();
  });

  it.each<[string, boolean]>([
    ['with the layers present', true],
    ['at rest in the layer slot', false],
  ])('raises no missing-key warning for a single unkeyed child %s', (_label, blend) => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const Card = styled(View)`
        background-color: red;
        background-image: linear-gradient(transparent, black);
        @media (prefers-color-scheme: dark) {
          background-blend-mode: multiply;
        }
      `;
      const getSpy = jest
        .spyOn(Appearance, 'getColorScheme')
        .mockReturnValue(blend ? 'dark' : 'light');
      try {
        // Elements built outside a JSX child position carry no key-validated flag.
        const tree = TestRenderer.create(
          React.createElement(Card, { children: React.createElement(View, { testID: 'only' }) })
        );
        tree.update(
          React.createElement(Card, {
            children: React.createElement(View, { testID: 'only' }),
            testID: 'again',
          })
        );
        expect(hasBlendLayer(tree)).toBe(blend);
      } finally {
        getSpy.mockRestore();
      }
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it.each<[string, () => ReturnType<typeof styled.View>]>([
    [
      'a static component',
      () => styled(View)`
        background-color: red;
        background-image: linear-gradient(transparent, black);
        background-blend-mode: multiply;
      `,
    ],
    [
      'a component with a function interpolation',
      () => styled(View)`
        background-color: ${() => 'red'};
        background-image: linear-gradient(transparent, black);
        background-blend-mode: multiply;
      `,
    ],
  ])('does not count the blend layers of %s for :nth-child', (_label, build) => {
    const Card = build();
    const Item = styled.View.withConfig({ displayName: 'BlendNthItem' })`
      color: black;
      &:first-child {
        color: red;
      }
    `;
    const tree = TestRenderer.create(
      <Card>
        <Item />
        <Item />
      </Card>
    );
    const styles = tree.root.findAllByType(Item).map(item => item.findByType(View).props.style);
    expect(styles).toEqual([[{ color: 'black' }, { color: 'red' }], { color: 'black' }]);
  });

  describe('function children', () => {
    /** Renders the pressed flag a target hands the function child, and counts mounts of its output. */
    function pressedProbe() {
      const counter = { mounts: 0 };
      function Probe({ pressed }: { pressed: boolean }) {
        React.useState(() => {
          counter.mounts++;
          return 0;
        });
        return <View testID={pressed ? 'probe-pressed' : 'probe-rest'} />;
      }
      const render = ({ pressed }: { pressed: boolean }) => <Probe pressed={pressed} />;
      return { counter, render };
    }

    it('calls a function child of a target when the layers are present', () => {
      const { counter, render } = pressedProbe();
      const Card = styled(Pressable)`
        background-color: red;
        background-image: linear-gradient(transparent, black);
        background-blend-mode: multiply;
      `;
      const tree = TestRenderer.create(<Card>{render}</Card>);

      expect(hasBlendLayer(tree)).toBe(true);
      expect(tree.root.findAllByProps({ testID: 'probe-rest' }).length).toBeGreaterThan(0);
      expect(counter.mounts).toBe(1);
    });

    it('calls a function child of a target when the layer slot is at rest, and keeps it mounted as layers appear', () => {
      const getSpy = jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
      const addSpy = jest.spyOn(Appearance, 'addChangeListener');
      try {
        const { counter, render } = pressedProbe();
        const Card = styled(Pressable)`
          background-color: red;
          background-image: linear-gradient(transparent, black);
          @media (prefers-color-scheme: dark) {
            background-blend-mode: multiply;
          }
        `;
        const tree = TestRenderer.create(<Card>{render}</Card>);
        const listener = addSpy.mock.calls[addSpy.mock.calls.length - 1]?.[0];
        expect(listener).toBeDefined();
        expect(hasBlendLayer(tree)).toBe(false);
        expect(tree.root.findAllByProps({ testID: 'probe-rest' }).length).toBeGreaterThan(0);

        TestRenderer.act(() => {
          listener!({ colorScheme: 'dark' });
        });
        expect(hasBlendLayer(tree)).toBe(true);
        expect(tree.root.findAllByProps({ testID: 'probe-rest' }).length).toBeGreaterThan(0);
        expect(counter.mounts).toBe(1);
      } finally {
        getSpy.mockRestore();
        addSpy.mockRestore();
      }
    });
  });
});

describe('background-blend-mode on a target that clones its only child', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    // A released TouchableHighlight hides its underlay on a timer; run it inside the test, not after it.
    jest.useFakeTimers();
  });

  afterEach(() => {
    TestRenderer.act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
    warnSpy.mockRestore();
  });

  const touchables = [
    ['TouchableWithoutFeedback', TouchableWithoutFeedback],
    ['TouchableHighlight', TouchableHighlight],
    ['TouchableNativeFeedback', TouchableNativeFeedback],
  ] as const;

  const blendCss = {
    layers: `
      background-color: red;
      background-image: linear-gradient(transparent, black);
      background-blend-mode: multiply;
    `,
    'a blend mode and no image to blend': `
      background-color: red;
      background-blend-mode: multiply;
    `,
  } as const;

  /** A press lands on the deepest ancestor of `leaf` that claims the responder; a tree with no claimant takes no press. */
  function pressFrom(leaf: TestRenderer.ReactTestInstance) {
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
    TestRenderer.act(() => responder?.props.onResponderGrant(event));
    TestRenderer.act(() => responder?.props.onResponderRelease(event));
  }

  const cases = touchables.flatMap(([name, Touchable]) =>
    (Object.keys(blendCss) as Array<keyof typeof blendCss>).map(
      kind => [name, kind, Touchable] as const
    )
  );

  it.each(cases)(
    'renders a styled %s with %s, and its single child takes the press',
    (_name, kind, Touchable) => {
      const onPress = jest.fn();
      const Target = styled(Touchable as React.ComponentType<any>)`
        ${blendCss[kind]}
      `;

      const tree = TestRenderer.create(
        <Target onPress={onPress}>
          <View>
            <Text testID="label">go</Text>
          </View>
        </Target>
      );
      pressFrom(tree.root.findByProps({ testID: 'label' }));

      expect(onPress).toHaveBeenCalledTimes(1);
    }
  );

  it.each(touchables)(
    'warns once that a styled %s cannot hold blend layers, and renders no layer',
    (name, Touchable) => {
      const Target = styled(Touchable as React.ComponentType<any>)`
        ${blendCss.layers}
      `;
      const render = () =>
        TestRenderer.create(
          <Target onPress={() => {}}>
            <View testID="child" />
          </Target>
        );

      const tree = render();
      render();

      expect(warnSpy.mock.calls).toEqual([
        [
          `[sc] \`background-blend-mode\` cannot be applied to a styled <${name}>, which passes its props to its single child. Put \`background-blend-mode\` on a <View> inside the <${name}> instead.`,
        ],
      ]);
      expect(hasWarned(warnKey('native-background-blend-mode-single-child-target', name))).toBe(
        true
      );
      expect(tree.root.findAll(node => node.props.shouldRasterizeIOS === true)).toHaveLength(0);
    }
  );

  it('stays silent on a styled TouchableHighlight with no blend mode', () => {
    const Target = styled(TouchableHighlight)`
      background-color: red;
    `;

    TestRenderer.create(
      <Target onPress={() => {}}>
        <View />
      </Target>
    );

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('stays silent on a styled View with layers, which holds them', () => {
    const Card = styled(View)`
      ${blendCss.layers}
    `;

    TestRenderer.create(<Card />);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('renders a styled View with a blend mode and no image to blend, and keeps its child', () => {
    const Card = styled(View)`
      ${blendCss['a blend mode and no image to blend']}
    `;

    const tree = TestRenderer.create(
      <Card>
        <Text testID="label">go</Text>
      </Card>
    );

    expect(tree.root.findAllByProps({ testID: 'label' }).length).toBeGreaterThan(0);
  });
});
