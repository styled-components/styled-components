/**
 * Render-path microbench. Measures per-render work on the native dynamic
 * render impl (`useDynamicImpl`), the path every styled native component
 * takes when its CSS isn't fully static.
 *
 * Three workloads:
 *  1. No responsive output: skips assembly, calls `composeBase`, then the
 *     adapter passthrough.
 *  2. One `@media` bucket: full assembly via `assembleFinalStyle`, then
 *     the adapter passthrough.
 *  3. Adapter passthrough in isolation.
 *
 * Hook overhead (context reads, `useMediaEnv`, `useRef`, the adapter's
 * hooks) is well-known on V8 and not measured
 * here. Hermes characteristics differ; final validation belongs in
 * `packages/ios-benchmark`.
 */
import { compareBench, bench } from './bench-utils';
import { assembleFinalStyle, composeBase } from '../models/StyledNativeComponent';
import { hasResponsiveOutput, type NativeStyles } from '../models/compileNative';
import type { MediaQueryEnv } from '../native/responsive';
import { passthroughOutput } from '../native/animation/types';

// The render benches below load the native entry, which reads react-native.
jest.mock('react-native', () => ({
  AccessibilityInfo: {
    addEventListener: () => ({ remove() {} }),
    isReduceMotionEnabled: () => Promise.resolve(false),
  },
  Appearance: { addChangeListener: () => ({ remove() {} }), getColorScheme: () => 'light' },
  Dimensions: {
    addEventListener: () => ({ remove() {} }),
    get: () => ({ fontScale: 1, height: 667, scale: 2, width: 375 }),
  },
  PixelRatio: { get: () => 2 },
  Platform: { OS: 'ios', select: (spec: Record<string, unknown>) => spec.ios ?? spec.default },
  // Stands in for React Native's Pressable: a function `style` or `children` receives `{pressed}`.
  Pressable: Object.assign(
    function Pressable({ children, style, testOnly_pressed, ...rest }: Record<string, any>) {
      const state = { pressed: testOnly_pressed === true };
      return require('react').createElement(
        'View',
        { ...rest, style: typeof style === 'function' ? style(state) : style },
        typeof children === 'function' ? children(state) : children
      );
    },
    { displayName: 'Pressable' }
  ),
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style },
  Text: 'Text',
  TextInput: Object.assign(
    function TextInput(props: Record<string, any>) {
      return require('react').createElement('View', props);
    },
    { displayName: 'TextInput' }
  ),
  // Stands in for React Native's TouchableOpacity: a plain `style` and children pass through to the host.
  TouchableOpacity: Object.assign(
    function TouchableOpacity({ children, ...rest }: Record<string, any>) {
      return require('react').createElement('View', rest, children);
    },
    { displayName: 'TouchableOpacity' }
  ),
  View: 'View',
}));

const env: MediaQueryEnv = {
  width: 375,
  height: 667,
  colorScheme: 'light',
  reduceMotion: false,
  fontScale: 1,
  pixelRatio: 2,
};

const containerCtx = { nearest: null, named: {} } as any;
const theme = {} as Record<string, any>;
const props = { color: 'red' } as Record<string, unknown>;
const resolveEnv = {
  media: env,
  container: null,
  theme,
  insets: null,
  rootFontSize: 16,
  fontSize: 16,
  lineHeight: 24,
  direction: 'ltr',
} as any;

const flatCompiled: NativeStyles = {
  base: { color: 'red', padding: 16 },
  conditional: [],
  nonPseudoEntries: [],
  pseudoEntries: [],
  pseudoReads: 0,
  hasPseudo: false,
  keyframes: [],
  publishesCascade: false,
};

const mediaBucket: NativeStyles['nonPseudoEntries'][number] = {
  type: 'media',
  condition: '(min-width: 400px)',
  styles: { padding: 32 },
};

const responsiveCompiled: NativeStyles = {
  base: { color: 'red', padding: 16 },
  conditional: [mediaBucket],
  // Current compiled output partitions `conditional` into pseudo / non-pseudo
  // buckets; a `@media` rule is non-pseudo, so the honor-the-bucket path reads
  // it here. Keep this in sync with the shape `compileNative` emits.
  nonPseudoEntries: [mediaBucket],
  pseudoEntries: [],
  pseudoReads: 0,
  hasPseudo: false,
  keyframes: [],
  publishesCascade: false,
};

describe('useDynamicImpl render-path work delta', () => {
  test('no responsive output: composeBase only vs full miss path', () => {
    compareBench(
      'no-responsive',
      500_000,
      {
        name: 'composeBase only',
        fn: () => {
          composeBase(flatCompiled.base, undefined);
        },
      },
      {
        name: 'composeBase + adapter passthrough',
        fn: () => {
          const composed = hasResponsiveOutput(flatCompiled)
            ? assembleFinalStyle(flatCompiled, env, containerCtx, theme, undefined, props)
            : composeBase(flatCompiled.base, undefined);
          passthroughOutput({
            compiled: flatCompiled,
            resolved: composed,
            target: 'View' as any,
            env: resolveEnv,
          });
        },
      },
      { label: 'No responsive output' }
    );
  });

  test('one @media bucket: composeBase shortcut vs honoring the bucket', () => {
    compareBench(
      'one-media-bucket',
      200_000,
      {
        name: 'composeBase shortcut (drops @media)',
        fn: () => {
          composeBase(responsiveCompiled.base, undefined);
        },
      },
      {
        name: 'assembleFinalStyle + adapter passthrough',
        fn: () => {
          const composed = hasResponsiveOutput(responsiveCompiled)
            ? assembleFinalStyle(responsiveCompiled, env, containerCtx, theme, undefined, props)
            : composeBase(responsiveCompiled.base, undefined);
          passthroughOutput({
            compiled: responsiveCompiled,
            resolved: composed,
            target: 'View' as any,
            env: resolveEnv,
          });
        },
      },
      { label: 'One @media bucket' }
    );
  });

  test('adapter passthrough cost in isolation', () => {
    bench('adapter passthroughOutput()', 1_000_000, () => {
      passthroughOutput({
        compiled: flatCompiled,
        resolved: flatCompiled.base,
        target: 'View' as any,
        env: resolveEnv,
      });
    });
  });
});

/**
 * Parent re-render with children, through the public `styled` API. The child
 * elements are built once and reused, so every child bails out and an update
 * costs the parent's own work: walking its children and wrapping each styled
 * child with its sibling position. Only the public API is used, so the same file
 * runs against any checkout.
 */
describe('styled parent re-render with children', () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let TestRenderer: any;
  let React: any;
  let styled: any;

  const priorNodeEnv = process.env.NODE_ENV;

  beforeAll(() => {
    // The test renderer flushes an update synchronously only inside `act`, which
    // React ships in its development build alone, so load that build here.
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    (globalThis as any).__NATIVE__ = true;
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    React = require('react');
    TestRenderer = require('react-test-renderer');
    styled = require('../native').default;
  });

  afterAll(() => {
    process.env.NODE_ENV = priorNodeEnv;
    (globalThis as any).__NATIVE__ = false;
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = false;
  });

  /** `propsFor(i)` is the parent's props at update `i`; it must differ between updates so the parent's body runs. */
  function benchUpdate(
    name: string,
    iterations: number,
    Parent: any,
    children: any,
    propsFor: (i: number) => Record<string, unknown>
  ) {
    let tree: any;
    TestRenderer.act(() => {
      tree = TestRenderer.create(React.createElement(Parent, propsFor(1), children));
    });
    bench(name, iterations, i => {
      TestRenderer.act(() => {
        tree.update(React.createElement(Parent, propsFor(i), children));
      });
    });
    TestRenderer.act(() => tree.unmount());
  }

  /** A prop that differs between updates, so the parent's body runs each time. */
  const tag = (i: number) => ({ testID: i % 2 === 0 ? 'b' : 'a' });

  const makeItem = () => styled.View`
    margin: 1px;
  `;

  /** `count` keyed elements of `Item`; `keyPrefix` keeps two lists in one tree from sharing keys. */
  function itemsOf(Item: any, count: number, keyPrefix = '') {
    return Array.from({ length: count }, (_, i) =>
      React.createElement(Item, { key: `${keyPrefix}${i}` })
    );
  }

  const twentyItems = () => itemsOf(makeItem(), 20);

  function benchRerender(name: string, iterations: number, build: () => any) {
    const Parent = styled.View`
      padding: 1px;
    `;
    benchUpdate(name, iterations, Parent, build(), tag);
  }

  test('5 plain children', () => {
    benchRerender('5 plain children', 20_000, () =>
      Array.from({ length: 5 }, (_, i) => React.createElement('View', { key: i }))
    );
  });

  test('5 styled children', () => {
    benchRerender('5 styled children', 20_000, () => itemsOf(makeItem(), 5));
  });

  test('3 + 2 styled children and a nested map of 20', () => {
    const Item = makeItem();
    benchRerender('3 + 2 styled children and a nested map of 20', 5_000, () => [
      React.createElement(Item, { key: 'a' }),
      React.createElement(Item, { key: 'b' }),
      React.createElement(Item, { key: 'c' }),
      [React.createElement(Item, { key: 'd' }), React.createElement(Item, { key: 'e' })],
      itemsOf(Item, 20, 'm'),
    ]);
  });

  describe('where a font size, line height or direction can come from', () => {
    const makeDynamicParent = () => styled.View`
      padding: ${(p: { $pad: number }) => p.$pad}px;
    `;

    test('dynamic parent, no cascade source, 20 reused styled children', () => {
      benchUpdate(
        'dynamic parent, no source, 20 children',
        20_000,
        makeDynamicParent(),
        twentyItems(),
        i => ({
          $pad: i % 2,
        })
      );
    });

    test('dynamic parent with a fresh style object that sets no font size', () => {
      benchUpdate(
        'dynamic parent, fresh {opacity}, 20 children',
        20_000,
        makeDynamicParent(),
        twentyItems(),
        i => ({
          $pad: i % 2,
          style: { opacity: 0.5 },
        })
      );
    });

    test('dynamic parent with a CSS font size', () => {
      const Parent = styled.View`
        font-size: 20px;
        padding: ${(p: { $pad: number }) => p.$pad}px;
      `;
      benchUpdate(
        'dynamic parent, CSS font-size, 20 children',
        5_000,
        Parent,
        twentyItems(),
        i => ({
          $pad: i % 2,
        })
      );
    });

    test('static parent with a fresh style object that sets a font size', () => {
      const Parent = styled.View`
        padding: 1px;
      `;
      benchUpdate(
        'static parent, fresh {fontSize}, 20 children',
        5_000,
        Parent,
        twentyItems(),
        i => ({
          ...tag(i),
          style: { fontSize: 20 },
        })
      );
    });

    test('static parent with a fresh style object that sets no font size', () => {
      const Parent = styled.View`
        padding: 1px;
      `;
      benchUpdate(
        'static parent, fresh {opacity}, 20 children',
        20_000,
        Parent,
        twentyItems(),
        i => ({
          ...tag(i),
          style: { opacity: 0.5 },
        })
      );
    });

    test('styled Pressable with an :active font size, at rest', () => {
      const Press = styled(require('react-native').Pressable)`
        padding: 1px;
        &:active {
          font-size: 30px;
        }
      `;
      benchUpdate(
        'Pressable :active font-size, at rest, 20 children',
        20_000,
        Press,
        twentyItems(),
        tag
      );
    });

    test('styled Pressable with an :active font size, pressed and released', () => {
      const Press = styled(require('react-native').Pressable)`
        padding: 1px;
        &:active {
          font-size: 30px;
        }
      `;
      benchUpdate(
        'Pressable :active font-size, flips, 20 children',
        20_000,
        Press,
        twentyItems(),
        i => ({
          testOnly_pressed: i % 2 === 0,
        })
      );
    });

    test('styled Pressable with only a :disabled rule, enabled', () => {
      const Press = styled(require('react-native').Pressable)`
        padding: 1px;
        &:disabled {
          font-size: 30px;
        }
      `;
      benchUpdate(
        'Pressable :disabled only, enabled, 20 children',
        20_000,
        Press,
        twentyItems(),
        tag
      );
    });

    test('styled Pressable with :active and :disabled rules, disabled flips', () => {
      const Press = styled(require('react-native').Pressable)`
        padding: 1px;
        &:active {
          font-size: 30px;
        }
        &:disabled {
          font-size: 20px;
        }
      `;
      benchUpdate(
        'Pressable :active and :disabled, disabled flips, 20 children',
        20_000,
        Press,
        twentyItems(),
        i => ({
          disabled: i % 2 === 0,
        })
      );
    });

    test('styled TouchableOpacity with a :disabled rule, at rest', () => {
      const Touch = styled(require('react-native').TouchableOpacity)`
        padding: 1px;
        &:disabled {
          font-size: 20px;
        }
      `;
      benchUpdate(
        'TouchableOpacity :disabled at rest, 20 children',
        20_000,
        Touch,
        twentyItems(),
        tag
      );
    });

    test('styled TextInput with disabled and no state rules', () => {
      const Input = styled(require('react-native').TextInput)`
        padding: 1px;
      `;
      benchUpdate('TextInput disabled, no rules, 20 children', 20_000, Input, twentyItems(), i => ({
        disabled: i % 2 === 0,
      }));
    });

    test('styled TextInput with a :read-write rule', () => {
      const Input = styled(require('react-native').TextInput)`
        padding: 1px;
        &:read-write {
          font-size: 20px;
        }
      `;
      benchUpdate('TextInput :read-write, 20 children', 20_000, Input, twentyItems(), tag);
    });

    function benchMount(name: string, Box: any) {
      // The renderer logs its deprecation notice on every create; the logging would dominate the timing.
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      try {
        bench(name, 500, () => {
          let tree: any;
          TestRenderer.act(() => {
            tree = TestRenderer.create(
              React.createElement(
                'View',
                null,
                Array.from({ length: 200 }, (_, i) => React.createElement(Box, { key: i }))
              )
            );
          });
          TestRenderer.act(() => tree.unmount());
        });
      } finally {
        errorSpy.mockRestore();
      }
    }

    test('mount and unmount 200 static boxes', () => {
      benchMount(
        'mount + unmount 200 static boxes',
        styled.View`
          margin: 1px;
        `
      );
    });

    test('mount and unmount 200 dynamic boxes', () => {
      benchMount(
        'mount + unmount 200 dynamic boxes',
        styled.View`
          margin: ${(p: { $pad?: number }) => p.$pad ?? 1}px;
        `
      );
    });
  });
});
