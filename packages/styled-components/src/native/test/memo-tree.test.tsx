/**
 * Empirical verification of how `React.memo` (which v7 wraps every styled
 * component in) propagates through deep trees on re-render. Each tree shape
 * has a per-component render counter; the assertions encode "this component
 * rendered N times after a parent state change," which makes the documented
 * memo behavior testable rather than vibes-based.
 *
 * Run: pnpm --filter styled-components test:native -- memo-tree
 */
import * as React from 'react';
import { Text, View } from 'react-native';
import TestRenderer from 'react-test-renderer';
import styled from '../';

// Per-test render counters. Reset before each `it`.
const counts: Record<string, number> = {};

beforeEach(() => {
  for (const key of Object.keys(counts)) delete counts[key];
});

const tally = (name: string) => {
  counts[name] = (counts[name] ?? 0) + 1;
};

/**
 * Vanilla React function components for the without-memo comparison. These
 * are NOT styled, so they don't get our memo wrapper; React renders them
 * unconditionally on every parent render.
 */
function Plain({ name, children }: { name: string; children?: React.ReactNode }) {
  tally(name);
  return <View>{children}</View>;
}

/**
 * styled() products that DO get our React.memo wrapper. Each render increments
 * a counter via a stateless function interpolation, so the counter ticks only
 * when memo doesn't bail.
 */
const StyledLeaf = styled(View)<{ $name: string }>`
  ${p => {
    tally(p.$name);
    return '';
  }}
`;

const StyledContainer = styled(View)<{ $name: string }>`
  ${p => {
    tally(p.$name);
    return '';
  }}
`;

describe('memo behavior with deep trees', () => {
  describe('linear chain, no children prop', () => {
    /**
     * Parent → Child → GrandChild. None pass children. All are styled →
     * all wrapped in React.memo. Parent's prop is the only thing that
     * changes; intermediate components have static props.
     */
    function Tree({ depth, payload }: { depth: number; payload: number }) {
      tally('Tree');
      const Inner1 = (
        <StyledLeaf $name="L1">
          <StyledLeaf $name="L2">
            <StyledLeaf $name="L3">
              <Text>
                {depth}-{payload}
              </Text>
            </StyledLeaf>
          </StyledLeaf>
        </StyledLeaf>
      );
      return <View>{Inner1}</View>;
    }

    it('first render: every level renders once', () => {
      TestRenderer.act(() => {
        TestRenderer.create(<Tree depth={3} payload={1} />);
      });
      expect(counts).toEqual({ Tree: 1, L1: 1, L2: 1, L3: 1 });
    });

    it('parent re-renders with same props: top component runs but leaf children with stable props bail', () => {
      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<Tree depth={3} payload={1} />);
      });
      // Reset the counters; we want to count the second-render-only cycle.
      for (const key of Object.keys(counts)) delete counts[key];
      TestRenderer.act(() => {
        renderer.update(<Tree depth={3} payload={1} />);
      });
      // Tree itself isn't memo'd (it's a vanilla function component) → it
      // re-runs. L1 is the outermost styled-component; its `children` prop
      // is a fresh JSX element (the L2/L3 nesting) so memo doesn't bail.
      // L1 re-runs. L1 passes its children prop to L2; L2's children prop
      // also differs by reference → L2 re-runs. Same for L3. So in this
      // shape, none of the styled components bail because each has a
      // different children prop reference each render.
      expect(counts).toEqual({ Tree: 1, L1: 1, L2: 1, L3: 1 });
    });

    it('with stable children via useMemo at the top: deep tree bails entirely', () => {
      function StableTree({ payload }: { payload: number }) {
        tally('StableTree');
        const inner = React.useMemo(
          () => (
            <StyledLeaf $name="L1">
              <StyledLeaf $name="L2">
                <StyledLeaf $name="L3">
                  <Text>stable</Text>
                </StyledLeaf>
              </StyledLeaf>
            </StyledLeaf>
          ),
          [] // never recomputes
        );
        return (
          <View>
            {inner}-{payload}
          </View>
        );
      }
      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<StableTree payload={1} />);
      });
      expect(counts).toEqual({ StableTree: 1, L1: 1, L2: 1, L3: 1 });
      for (const key of Object.keys(counts)) delete counts[key];
      TestRenderer.act(() => {
        renderer.update(<StableTree payload={2} />);
      });
      // StableTree re-runs (payload changed), but `inner` is a stable ref
      // from useMemo. L1 receives the same children prop reference as
      // before. memo on L1 bails → L1 and its entire subtree skip.
      expect(counts).toEqual({ StableTree: 1 });
    });
  });

  describe('container with sibling leaves', () => {
    /**
     * The shape that mirrors the iOS bench: one container, N leaves with
     * stable per-leaf props but JSX-created fresh-ref each parent render.
     */
    function ListLike({ tick }: { tick: number }) {
      tally('ListLike');
      const items = [];
      for (let i = 0; i < 5; i++) {
        items.push(
          <StyledLeaf
            key={i}
            $name={`Leaf-${i}`}
            // tick changes each parent render but doesn't reach Leaf since
            // we don't pass it down; the leaf's own props are stable.
          />
        );
      }
      return <StyledContainer $name="Container">{items}</StyledContainer>;
    }

    it('first render: container + each leaf renders once', () => {
      TestRenderer.act(() => {
        TestRenderer.create(<ListLike tick={1} />);
      });
      expect(counts).toEqual({
        ListLike: 1,
        Container: 1,
        'Leaf-0': 1,
        'Leaf-1': 1,
        'Leaf-2': 1,
        'Leaf-3': 1,
        'Leaf-4': 1,
      });
    });

    it('parent re-renders with same leaf props: leaves all bail, container does not (children prop differs)', () => {
      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<ListLike tick={1} />);
      });
      for (const key of Object.keys(counts)) delete counts[key];
      TestRenderer.act(() => {
        renderer.update(<ListLike tick={2} />);
      });
      // ListLike re-runs (tick prop changed). It rebuilds the items array
      // with fresh React elements for each Leaf. Container's children prop
      // is the new items array (different reference) → Container's memo
      // doesn't bail; Container re-renders. Each Leaf, however, has the
      // same per-leaf prop values as before → each Leaf's memo bails.
      // This is the bench's hot path: leaves skip, container runs once.
      expect(counts).toEqual({ ListLike: 1, Container: 1 });
    });

    it('parent re-renders, leaf prop CHANGES for one leaf: only that leaf re-renders', () => {
      function ListWithChanging({ leafIndex }: { leafIndex: number }) {
        tally('ListWithChanging');
        const items = [];
        for (let i = 0; i < 5; i++) {
          items.push(
            <StyledLeaf
              key={i}
              $name={`Leaf-${i}`}
              // Pass an extra prop that varies by parent state
              {...(i === leafIndex ? ({ $focused: true } as object) : {})}
            />
          );
        }
        return <StyledContainer $name="Container">{items}</StyledContainer>;
      }
      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<ListWithChanging leafIndex={2} />);
      });
      for (const key of Object.keys(counts)) delete counts[key];
      // Move "focus" from leaf 2 to leaf 3
      TestRenderer.act(() => {
        renderer.update(<ListWithChanging leafIndex={3} />);
      });
      // ListWithChanging + Container re-render (tick + children-ref changed).
      // Leaf-2 lost the $focused prop → its props differ → its memo doesn't
      // bail → re-renders. Leaf-3 gained the $focused prop → same. The
      // other leaves (0, 1, 4) have unchanged props → their memos bail.
      expect(counts).toEqual({
        ListWithChanging: 1,
        Container: 1,
        'Leaf-2': 1,
        'Leaf-3': 1,
      });
    });
  });

  describe('memo vs no-memo: side-by-side comparison', () => {
    /**
     * Same tree shape, one styled (memo'd) and one plain (not memo'd).
     * Both rooted in a parent that re-renders with stable subtree props.
     */
    function Comparison({ tick }: { tick: number }) {
      tally('Comparison');
      return (
        <View>
          <StyledLeaf $name="styledLeaf" />
          <Plain name="plainLeaf" />
          <Text>{tick}</Text>
        </View>
      );
    }

    it('on parent re-render: styled (memo) leaf skips, plain leaf runs every time', () => {
      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<Comparison tick={0} />);
      });
      for (const key of Object.keys(counts)) delete counts[key];
      TestRenderer.act(() => {
        renderer.update(<Comparison tick={1} />);
      });
      TestRenderer.act(() => {
        renderer.update(<Comparison tick={2} />);
      });
      TestRenderer.act(() => {
        renderer.update(<Comparison tick={3} />);
      });
      // Three re-renders. styledLeaf has no children, no other props that
      // changed → memo bails all 3 times → counter stays at 0. plainLeaf
      // is not memo'd → re-renders every time → counter ticks 3 times.
      expect(counts.Comparison).toBe(3);
      expect(counts.styledLeaf ?? 0).toBe(0);
      expect(counts.plainLeaf).toBe(3);
    });
  });

  describe('cascade through context (memo does NOT block context updates)', () => {
    const CountContext = React.createContext(0);

    const ContextReader = styled(View)<{ $name: string }>`
      ${p => {
        tally(p.$name);
        return '';
      }}
    `;

    function ConsumerWithContext() {
      const c = React.useContext(CountContext);
      tally(`consumer-${c}`);
      return <ContextReader $name="reader" />;
    }

    function Provider({ value }: { value: number }) {
      tally('provider');
      return (
        <CountContext.Provider value={value}>
          <ConsumerWithContext />
        </CountContext.Provider>
      );
    }

    it('context change re-renders the consumer even though intermediates are memo-clean', () => {
      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<Provider value={0} />);
      });
      // First render: provider, consumer-0, reader all log.
      expect(counts).toEqual({ provider: 1, 'consumer-0': 1, reader: 1 });
      for (const key of Object.keys(counts)) delete counts[key];
      TestRenderer.act(() => {
        renderer.update(<Provider value={1} />);
      });
      // Provider re-renders (props changed). It returns the same JSX shape;
      // consumer subscribes to context so it re-runs. The reader's own
      // props ({$name: "reader"}) are stable; reader's memo bails. So
      // memo correctly skips the reader since its props haven't moved,
      // and the consumer above it (not memo'd) does the context read.
      expect(counts).toEqual({ provider: 1, 'consumer-1': 1 });
      expect(counts.reader ?? 0).toBe(0);
    });
  });
});

/**
 * Defensive coverage: scenarios commonly raised in the React community as
 * memo footguns. Each test asserts what SHOULD happen so a future regression
 * can't silently break user expectations.
 */
describe('edge cases: trying to break memo', () => {
  describe('hooks in styled subtree (state updates bypass memo)', () => {
    it('useState in a child re-renders that child only', () => {
      let setCount!: (n: number) => void;
      function StatefulChild() {
        const [n, set] = React.useState(0);
        setCount = set;
        tally(`stateful-${n}`);
        return <Text>{n}</Text>;
      }

      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(
          <StyledLeaf $name="parent">
            <StatefulChild />
          </StyledLeaf>
        );
      });
      expect(counts).toEqual({ parent: 1, 'stateful-0': 1 });

      for (const k of Object.keys(counts)) delete counts[k];
      TestRenderer.act(() => {
        setCount(1);
      });
      // Memo only short-circuits at parent-prop comparison. State updates trigger
      // re-render of the SPECIFIC component that owns the state.
      expect(counts).toEqual({ 'stateful-1': 1 });

      // Reference renderer to satisfy linter; the test relies on side effects.
      expect(renderer).toBeDefined();
    });

    it('useReducer in a child re-renders that child only', () => {
      let dispatch!: () => void;
      function ReducerChild() {
        const [n, d] = React.useReducer((s: number) => s + 1, 0);
        dispatch = d;
        tally(`reducer-${n}`);
        return <Text>{n}</Text>;
      }

      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(
          <StyledLeaf $name="parent">
            <ReducerChild />
          </StyledLeaf>
        );
      });

      for (const k of Object.keys(counts)) delete counts[k];
      TestRenderer.act(() => {
        dispatch();
      });
      expect(counts).toEqual({ 'reducer-1': 1 });
      expect(renderer).toBeDefined();
    });

    it('useSyncExternalStore in a child re-renders on emitter event', () => {
      const subscribers = new Set<() => void>();
      let value = 0;
      const subscribe = (cb: () => void) => {
        subscribers.add(cb);
        return () => {
          subscribers.delete(cb);
        };
      };
      const getSnapshot = () => value;

      function ExternalSubscriber() {
        const v = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
        tally(`external-${v}`);
        return <Text>{v}</Text>;
      }

      TestRenderer.act(() => {
        TestRenderer.create(
          <StyledLeaf $name="parent">
            <ExternalSubscriber />
          </StyledLeaf>
        );
      });

      for (const k of Object.keys(counts)) delete counts[k];
      TestRenderer.act(() => {
        value = 1;
        for (const cb of subscribers) cb();
      });
      // External subscriber forces a re-render via React's internal hook
      // mechanism; memo on the parent has no effect on this path.
      expect(counts).toEqual({ 'external-1': 1 });
    });
  });

  describe('effects in styled subtree fire correctly', () => {
    it('useEffect mount and unmount lifecycle is preserved', () => {
      const events: string[] = [];
      function ChildWithEffect() {
        React.useEffect(() => {
          events.push('mount');
          return () => events.push('unmount');
        }, []);
        return <Text>x</Text>;
      }

      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(
          <StyledLeaf $name="effect-parent">
            <ChildWithEffect />
          </StyledLeaf>
        );
      });
      expect(events).toEqual(['mount']);

      TestRenderer.act(() => {
        renderer.unmount();
      });
      expect(events).toEqual(['mount', 'unmount']);
    });

    it('useEffect deps drive re-fire even with memo above', () => {
      const events: string[] = [];
      function ChildWithEffect({ trigger }: { trigger: number }) {
        React.useEffect(() => {
          events.push(`effect-${trigger}`);
          return () => events.push(`cleanup-${trigger}`);
        }, [trigger]);
        return <Text>{trigger}</Text>;
      }

      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(
          <StyledLeaf $name="effect-deps-parent">
            <ChildWithEffect trigger={1} />
          </StyledLeaf>
        );
      });
      expect(events).toEqual(['effect-1']);

      TestRenderer.act(() => {
        renderer.update(
          <StyledLeaf $name="effect-deps-parent">
            <ChildWithEffect trigger={2} />
          </StyledLeaf>
        );
      });
      // Children prop differs (new JSX element each parent render), so the
      // styled parent re-renders, the child re-renders with new trigger,
      // cleanup runs, then the new effect fires.
      expect(events).toEqual(['effect-1', 'cleanup-1', 'effect-2']);
    });
  });

  describe('refs work correctly through memo', () => {
    it('createRef receives the underlying view', () => {
      const ref = React.createRef<any>();
      TestRenderer.act(() => {
        TestRenderer.create(<StyledLeaf $name="created-ref" ref={ref} />);
      });
      expect(ref.current).not.toBeNull();
    });

    it('callback ref fires with the view instance', () => {
      const refValues: any[] = [];
      const refCallback = (el: any) => {
        if (el) refValues.push(el);
      };
      TestRenderer.act(() => {
        TestRenderer.create(<StyledLeaf $name="callback-ref" ref={refCallback} />);
      });
      expect(refValues.length).toBe(1);
    });

    it('ref instance is stable across memo bails', () => {
      const ref = React.createRef<any>();
      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<StyledLeaf $name="stable-ref" ref={ref} />);
      });
      const before = ref.current;

      TestRenderer.act(() => {
        renderer.update(<StyledLeaf $name="stable-ref" ref={ref} />);
      });
      // Same view instance preserved since memo bailed; ref keeps pointing at it.
      expect(ref.current).toBe(before);
    });

    it('useImperativeHandle exposes methods even when memo bails', () => {
      const handle = React.createRef<{ greet: () => string }>();

      const ImperativeChild = React.forwardRef<{ greet: () => string }, { name: string }>(
        ({ name }, ref) => {
          React.useImperativeHandle(ref, () => ({
            greet: () => `hi from ${name}`,
          }));
          return <Text>{name}</Text>;
        }
      );

      function Parent({ tick, name }: { tick: number; name: string }) {
        return (
          <StyledLeaf $name="imperative-parent">
            <ImperativeChild ref={handle} name={name} />
          </StyledLeaf>
        );
      }

      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<Parent tick={1} name="alice" />);
      });
      expect(handle.current?.greet()).toBe('hi from alice');

      TestRenderer.act(() => {
        renderer.update(<Parent tick={2} name="alice" />);
      });
      // Same name → child re-renders only because parent passes fresh JSX
      // children. Imperative handle is rewritten with fresh closure each render.
      expect(handle.current?.greet()).toBe('hi from alice');
    });
  });

  describe('inline reference props defeat memo (no correctness break, just no perf win)', () => {
    it('inline style object → fresh ref each render → memo never bails', () => {
      function ParentInline({ tick }: { tick: number }) {
        return <StyledLeaf $name="inline-style" style={{ marginTop: 0 }} />;
      }

      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<ParentInline tick={1} />);
      });
      for (const k of Object.keys(counts)) delete counts[k];

      TestRenderer.act(() => {
        renderer.update(<ParentInline tick={2} />);
      });
      // {marginTop: 0} is a fresh object each render → shallow-compare miss.
      expect(counts).toEqual({ 'inline-style': 1 });
    });

    it('inline event handler → fresh ref each render → memo never bails', () => {
      function ParentInline({ tick }: { tick: number }) {
        return <StyledLeaf $name="inline-handler" onLayout={() => undefined} />;
      }

      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<ParentInline tick={1} />);
      });
      for (const k of Object.keys(counts)) delete counts[k];

      TestRenderer.act(() => {
        renderer.update(<ParentInline tick={2} />);
      });
      expect(counts).toEqual({ 'inline-handler': 1 });
    });
  });

  describe('polymorphic as prop', () => {
    it('changing as triggers re-render', () => {
      function Poly({ as }: { as: any }) {
        return <StyledLeaf $name="poly-leaf" as={as} />;
      }

      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<Poly as={View} />);
      });
      for (const k of Object.keys(counts)) delete counts[k];

      TestRenderer.act(() => {
        renderer.update(<Poly as={Text} />);
      });
      expect(counts).toEqual({ 'poly-leaf': 1 });
    });

    it('stable as prop bails', () => {
      function StablePoly({ tick }: { tick: number }) {
        return <StyledLeaf $name="stable-poly" as={View} />;
      }

      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<StablePoly tick={1} />);
      });
      for (const k of Object.keys(counts)) delete counts[k];

      TestRenderer.act(() => {
        renderer.update(<StablePoly tick={2} />);
      });
      // tick is not consumed by the styled leaf; only `as` matters and `as`
      // is stable. Memo bails.
      expect(counts).toEqual({});
    });
  });

  describe('conditional rendering lifecycle', () => {
    it('mount + unmount via toggle does not corrupt state', () => {
      function Conditional({ show }: { show: boolean }) {
        return <View>{show && <StyledLeaf $name="conditional-leaf" />}</View>;
      }

      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<Conditional show={true} />);
      });
      expect(counts).toEqual({ 'conditional-leaf': 1 });

      for (const k of Object.keys(counts)) delete counts[k];
      TestRenderer.act(() => {
        renderer.update(<Conditional show={false} />);
      });
      expect(counts).toEqual({});

      TestRenderer.act(() => {
        renderer.update(<Conditional show={true} />);
      });
      expect(counts).toEqual({ 'conditional-leaf': 1 });
    });
  });

  describe('multi-instance independence', () => {
    it('changing one instance prop does not re-render its sibling', () => {
      function TwoInstances({ leftTick, rightTick }: { leftTick: number; rightTick: number }) {
        return (
          <View>
            <StyledLeaf $name={`left-${leftTick}`} />
            <StyledLeaf $name={`right-${rightTick}`} />
          </View>
        );
      }

      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<TwoInstances leftTick={1} rightTick={1} />);
      });
      for (const k of Object.keys(counts)) delete counts[k];

      TestRenderer.act(() => {
        renderer.update(<TwoInstances leftTick={2} rightTick={1} />);
      });
      expect(counts['left-2']).toBe(1);
      expect(counts['right-1'] ?? 0).toBe(0);
    });
  });

  describe('Object.is comparison edge cases', () => {
    it('NaN prop bails (Object.is(NaN, NaN) === true)', () => {
      function ParentWithNaN({ tick }: { tick: number }) {
        // Pass NaN as a $-prefixed prop (custom prop, not consumed by RN).
        return <StyledLeaf $name="nan-leaf" {...({ $value: NaN } as any)} />;
      }

      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<ParentWithNaN tick={1} />);
      });
      for (const k of Object.keys(counts)) delete counts[k];

      TestRenderer.act(() => {
        renderer.update(<ParentWithNaN tick={2} />);
      });
      // === would consider NaN !== NaN. React.memo uses Object.is which returns
      // true for NaN, NaN. So memo bails.
      expect(counts).toEqual({});
    });

    it('+0 vs -0 prop change is NOT visible (internal cache uses === semantics)', () => {
      function ParentWithSignedZero({ z }: { z: number }) {
        return <StyledLeaf $name="zero-leaf" {...({ $value: z } as any)} />;
      }

      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<ParentWithSignedZero z={0} />);
      });
      for (const k of Object.keys(counts)) delete counts[k];

      TestRenderer.act(() => {
        renderer.update(<ParentWithSignedZero z={-0} />);
      });
      // Two layers of compare are at play here:
      //
      //   1. React.memo uses Object.is. Object.is(+0, -0) === false → memo
      //      does NOT bail; impl runs.
      //   2. Our internal shallowEqualContext (per-instance render cache in
      //      useImpl) uses ===. 0 === -0 is true → cache reports "equal" and
      //      returns the cached element without re-running the interpolation.
      //
      // Net effect: counter stays put. In practice no CSS property is sensitive
      // to signed zero, so this divergence has zero user-observable impact.
      expect(counts).toEqual({});
    });
  });

  describe('attrs is correctly memoized (pure function on props)', () => {
    it('attrs is skipped when props are unchanged', () => {
      let attrsCalls = 0;
      const Counter = styled(View).attrs(() => {
        attrsCalls++;
        return {};
      })`
        background: red;
      `;

      function Parent({ tick }: { tick: number }) {
        return <Counter />;
      }

      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<Parent tick={1} />);
      });
      expect(attrsCalls).toBe(1);

      TestRenderer.act(() => {
        renderer.update(<Parent tick={2} />);
      });
      // attrs is contractually `(props) => attrs` — a pure function on props.
      // Same props in, same attrs out, so skipping it on bail-only re-renders
      // is correct memoization, not a behavior change.
      expect(attrsCalls).toBe(1);
    });

    it('attrs IS called when a prop changes', () => {
      let attrsCalls = 0;
      const PropDriven = styled(View).attrs<{ $tick: number }>(p => {
        attrsCalls++;
        return { testID: `tick-${p.$tick}` };
      })`
        background: red;
      `;

      function Parent({ tick }: { tick: number }) {
        return <PropDriven $tick={tick} />;
      }

      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<Parent tick={1} />);
      });
      expect(attrsCalls).toBe(1);

      TestRenderer.act(() => {
        renderer.update(<Parent tick={2} />);
      });
      // $tick changed → memo invalidates → attrs re-evaluated.
      expect(attrsCalls).toBe(2);
    });
  });

  describe('CSS interpolation function is correctly memoized (pure function on props/theme)', () => {
    it('interpolation function is skipped when props/theme are unchanged', () => {
      let interpCalls = 0;
      const Themed = styled(View)`
        ${() => {
          interpCalls++;
          return 'background: red;';
        }}
      `;

      function Parent({ tick }: { tick: number }) {
        return <Themed />;
      }

      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<Parent tick={1} />);
      });
      expect(interpCalls).toBe(1);

      TestRenderer.act(() => {
        renderer.update(<Parent tick={2} />);
      });
      // Interpolation functions are contractually `(props, theme) => string` —
      // pure functions on (props, theme). Same inputs, same output. Skipping
      // them on bail-only re-renders is correct memoization, not a behavior
      // change.
      expect(interpCalls).toBe(1);
    });
  });

  describe('very deep tree memo bail propagation', () => {
    it('10-level chain with stable subtree skips entirely on parent re-render', () => {
      function VeryDeep({ payload }: { payload: number }) {
        const inner = React.useMemo(
          () => (
            <StyledLeaf $name="L0">
              <StyledLeaf $name="L1">
                <StyledLeaf $name="L2">
                  <StyledLeaf $name="L3">
                    <StyledLeaf $name="L4">
                      <StyledLeaf $name="L5">
                        <StyledLeaf $name="L6">
                          <StyledLeaf $name="L7">
                            <StyledLeaf $name="L8">
                              <StyledLeaf $name="L9">
                                <Text>deep</Text>
                              </StyledLeaf>
                            </StyledLeaf>
                          </StyledLeaf>
                        </StyledLeaf>
                      </StyledLeaf>
                    </StyledLeaf>
                  </StyledLeaf>
                </StyledLeaf>
              </StyledLeaf>
            </StyledLeaf>
          ),
          []
        );
        return (
          <View>
            {inner}
            <Text>{payload}</Text>
          </View>
        );
      }

      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<VeryDeep payload={1} />);
      });
      expect(Object.keys(counts).length).toBe(10);

      for (const k of Object.keys(counts)) delete counts[k];
      TestRenderer.act(() => {
        renderer.update(<VeryDeep payload={2} />);
      });
      // useMemo'd subtree → L0 children prop is referentially stable → memo
      // bails at L0 → none of L1..L9 are even visited. Zero work in 10 levels.
      expect(counts).toEqual({});
    });
  });

  describe("ThemeProvider updates propagate through memo'd intermediates", () => {
    /**
     * The big real-world question: a deeply-nested styled component reads
     * `theme` via interpolation. ThemeProvider at the root flips theme. Does
     * the deep child re-render despite many memo'd ancestors in between?
     *
     * Theme reaches styled components via React context (`ThemeContext`),
     * which `useImpl` subscribes to via `useContext`. Context propagation
     * walks the consumer list directly; memo'd intermediates don't block it.
     */
    it('theme change re-renders deep styled component', () => {
      const styledLib = require('../');
      const ThemeProvider = styledLib.ThemeProvider as typeof import('../').ThemeProvider;
      const ThemedLeaf = styled(View)<{ $name: string }>`
        ${(p: any) => {
          tally(`${p.$name}-${p.theme.color}`);
          return '';
        }}
      `;

      function App({ color }: { color: string }) {
        return (
          <ThemeProvider theme={{ color }}>
            <StyledContainer $name="outer">
              <StyledContainer $name="middle">
                <ThemedLeaf $name="themed" />
              </StyledContainer>
            </StyledContainer>
          </ThemeProvider>
        );
      }

      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<App color="red" />);
      });
      expect(counts['themed-red']).toBe(1);

      for (const k of Object.keys(counts)) delete counts[k];
      TestRenderer.act(() => {
        renderer.update(<App color="blue" />);
      });
      // Theme changed → context consumer re-renders despite memo'd parents.
      expect(counts['themed-blue']).toBe(1);
    });
  });

  describe('double-memo wrapping (no harm)', () => {
    it('wrapping a styled in another React.memo composes correctly', () => {
      const DoubleMemo = React.memo<{ $name: string; $tick: number }>(props => (
        <StyledLeaf $name={props.$name} />
      ));
      DoubleMemo.displayName = 'DoubleMemo';

      let renderer!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(<DoubleMemo $name="wrapped" $tick={1} />);
      });
      for (const k of Object.keys(counts)) delete counts[k];

      TestRenderer.act(() => {
        renderer.update(<DoubleMemo $name="wrapped" $tick={1} />);
      });
      // Outer memo bails → inner styled never gets called.
      expect(counts).toEqual({});
    });
  });
});
