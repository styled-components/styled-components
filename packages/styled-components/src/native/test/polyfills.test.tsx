import React from 'react';
import { View } from 'react-native';
import TestRenderer from 'react-test-renderer';
import styled from '../index';
import {
  __resetPlatformCacheForTesting,
  applyBackgroundBlendModePolyfill,
  applyStylePolyfills,
  isWebPlatform,
} from '../polyfills';

// ──────────────────────────────────────────────────────────────────
//  isWebPlatform
// ──────────────────────────────────────────────────────────────────

describe('isWebPlatform', () => {
  beforeEach(() => __resetPlatformCacheForTesting());

  it('reports false under the RN jest preset (Platform.OS=ios)', () => {
    expect(isWebPlatform()).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────
//  applyBackgroundBlendModePolyfill
// ──────────────────────────────────────────────────────────────────

describe('applyBackgroundBlendModePolyfill (pure)', () => {
  function gather(out: Record<string, unknown>): React.ReactElement[] {
    const children = out.children as React.ReactElement[];
    return children.filter(c => c && (c as { key: unknown }).key);
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
    const children = out.children as React.ReactElement[];
    expect(children).toHaveLength(3);
    expect(children[0].key).toBe('__sc_bg_blend_color');
    expect(children[1].key).toBe('__sc_bg_blend_0');
    expect(children[2]).toBe(userChild);
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

    const layers = (out.children as React.ReactElement[]).filter(
      c => c && (c as { key: unknown }).key
    );
    const bgLayer = layers[0];
    expect(bgLayer.key).toBe('__sc_bg_blend_color');
    expect((bgLayer.props as { style: Record<string, unknown> }).style.backgroundColor).toBe('red');
  });

  it('passes through function-form style (Pressable callback) untouched', () => {
    const fn = () => ({});
    const props = { style: fn, children: null };
    expect(applyBackgroundBlendModePolyfill(props)).toBe(props);
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
      const layers = (out.children as React.ReactElement[]).filter(
        c => c && (c as { key: unknown }).key
      );
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
      const wrapper = (out.children as React.ReactElement[])[1];
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
      const wrapper = (out.children as React.ReactElement[])[1];
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
      const layers = (out.children as React.ReactElement[]).filter(
        c => c && (c as { key: unknown }).key
      );
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
      const wrapper = (out.children as React.ReactElement[])[1];
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
      const layers = (out.children as React.ReactElement[]).filter(
        c => c && (c as { key: unknown }).key
      );
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
      const layers = (out.children as React.ReactElement[]).filter(
        c => c && (c as { key: unknown }).key
      );
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
