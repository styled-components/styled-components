/**
 * Empirical verification of how `React.memo` (which v7 wraps every styled
 * component in) propagates through deep trees on re-render. Each tree shape
 * has a per-component render counter; the assertions encode "this component
 * rendered N times after a parent state change," which makes the documented
 * memo behavior testable rather than vibes-based.
 *
 * Mirrors src/native/test/memo-tree.test.tsx, adapted for the web entry.
 *
 * Run: pnpm --filter styled-components test:web -- memo-tree
 */
import { act, render } from '@testing-library/react';
import * as React from 'react';
import ThemeProvider from '../models/ThemeProvider';
import { resetStyled } from './utils';

let styled: ReturnType<typeof resetStyled>;

const counts: Record<string, number> = {};

beforeEach(() => {
  styled = resetStyled();
  for (const key of Object.keys(counts)) delete counts[key];
});

const tally = (name: string) => {
  counts[name] = (counts[name] ?? 0) + 1;
};

function Plain({ name, children }: { name: string; children?: React.ReactNode }) {
  tally(name);
  return <div>{children}</div>;
}

const makeStyled = () => ({
  StyledLeaf: styled.div<{ $name: string }>`
    ${(p: any) => {
      tally(p.$name);
      return '';
    }}
  `,
  StyledContainer: styled.div<{ $name: string }>`
    ${(p: any) => {
      tally(p.$name);
      return '';
    }}
  `,
});

describe('memo behavior with deep trees', () => {
  describe('linear chain, no children prop', () => {
    it('first render: every level renders once', () => {
      const { StyledLeaf } = makeStyled();
      function Tree({ depth, payload }: { depth: number; payload: number }) {
        tally('Tree');
        return (
          <div>
            <StyledLeaf $name="L1">
              <StyledLeaf $name="L2">
                <StyledLeaf $name="L3">
                  <span>
                    {depth}-{payload}
                  </span>
                </StyledLeaf>
              </StyledLeaf>
            </StyledLeaf>
          </div>
        );
      }
      render(<Tree depth={3} payload={1} />);
      expect(counts).toEqual({ Tree: 1, L1: 1, L2: 1, L3: 1 });
    });

    it('parent re-renders with same props: leaves re-run because children prop differs by ref', () => {
      const { StyledLeaf } = makeStyled();
      function Tree({ depth, payload }: { depth: number; payload: number }) {
        tally('Tree');
        return (
          <div>
            <StyledLeaf $name="L1">
              <StyledLeaf $name="L2">
                <StyledLeaf $name="L3">
                  <span>
                    {depth}-{payload}
                  </span>
                </StyledLeaf>
              </StyledLeaf>
            </StyledLeaf>
          </div>
        );
      }
      const { rerender } = render(<Tree depth={3} payload={1} />);
      for (const key of Object.keys(counts)) delete counts[key];
      rerender(<Tree depth={3} payload={1} />);
      // Each level's `children` prop is a fresh JSX element each parent render.
      // Memo's shallow compare sees "different" children → no bail.
      expect(counts).toEqual({ Tree: 1, L1: 1, L2: 1, L3: 1 });
    });

    it('with stable children via useMemo: deep tree bails entirely', () => {
      const { StyledLeaf } = makeStyled();
      function StableTree({ payload }: { payload: number }) {
        tally('StableTree');
        const inner = React.useMemo(
          () => (
            <StyledLeaf $name="L1">
              <StyledLeaf $name="L2">
                <StyledLeaf $name="L3">
                  <span>stable</span>
                </StyledLeaf>
              </StyledLeaf>
            </StyledLeaf>
          ),
          [] // never recomputes
        );
        return (
          <div>
            {inner}-{payload}
          </div>
        );
      }
      const { rerender } = render(<StableTree payload={1} />);
      expect(counts).toEqual({ StableTree: 1, L1: 1, L2: 1, L3: 1 });
      for (const key of Object.keys(counts)) delete counts[key];
      rerender(<StableTree payload={2} />);
      // useMemo'd subtree → L1 children prop ref is stable → memo bails →
      // entire subtree skipped.
      expect(counts).toEqual({ StableTree: 1 });
    });
  });

  describe('container with sibling leaves', () => {
    it('first render: container + each leaf renders once', () => {
      const { StyledContainer, StyledLeaf } = makeStyled();
      function ListLike({ tick }: { tick: number }) {
        tally('ListLike');
        const items: React.ReactElement[] = [];
        for (let i = 0; i < 5; i++) {
          items.push(<StyledLeaf key={i} $name={`Leaf-${i}`} />);
        }
        return <StyledContainer $name="Container">{items}</StyledContainer>;
      }
      render(<ListLike tick={1} />);
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

    it('parent re-renders with same leaf props: leaves all bail, container does not', () => {
      const { StyledContainer, StyledLeaf } = makeStyled();
      function ListLike({ tick }: { tick: number }) {
        tally('ListLike');
        const items: React.ReactElement[] = [];
        for (let i = 0; i < 5; i++) {
          items.push(<StyledLeaf key={i} $name={`Leaf-${i}`} />);
        }
        return <StyledContainer $name="Container">{items}</StyledContainer>;
      }
      const { rerender } = render(<ListLike tick={1} />);
      for (const key of Object.keys(counts)) delete counts[key];
      rerender(<ListLike tick={2} />);
      // Container's children prop is a fresh array each render → container
      // re-renders. Leaves have stable per-instance props → memo bails on each.
      expect(counts).toEqual({ ListLike: 1, Container: 1 });
    });

    it('parent re-renders, leaf prop CHANGES for one leaf: only that leaf re-renders', () => {
      const { StyledContainer, StyledLeaf } = makeStyled();
      function ListWithChanging({ leafIndex }: { leafIndex: number }) {
        tally('ListWithChanging');
        const items: React.ReactElement[] = [];
        for (let i = 0; i < 5; i++) {
          items.push(
            <StyledLeaf
              key={i}
              $name={`Leaf-${i}`}
              {...(i === leafIndex ? ({ $focused: true } as object) : {})}
            />
          );
        }
        return <StyledContainer $name="Container">{items}</StyledContainer>;
      }
      const { rerender } = render(<ListWithChanging leafIndex={2} />);
      for (const key of Object.keys(counts)) delete counts[key];
      rerender(<ListWithChanging leafIndex={3} />);
      expect(counts).toEqual({
        ListWithChanging: 1,
        Container: 1,
        'Leaf-2': 1,
        'Leaf-3': 1,
      });
    });
  });

  describe('memo vs no-memo: side-by-side comparison', () => {
    it('on parent re-render: styled (memo) leaf skips, plain leaf runs every time', () => {
      const { StyledLeaf } = makeStyled();
      function Comparison({ tick }: { tick: number }) {
        tally('Comparison');
        return (
          <div>
            <StyledLeaf $name="styledLeaf" />
            <Plain name="plainLeaf" />
            <span>{tick}</span>
          </div>
        );
      }
      const { rerender } = render(<Comparison tick={0} />);
      for (const key of Object.keys(counts)) delete counts[key];
      rerender(<Comparison tick={1} />);
      rerender(<Comparison tick={2} />);
      rerender(<Comparison tick={3} />);
      expect(counts.Comparison).toBe(3);
      expect(counts.styledLeaf ?? 0).toBe(0);
      expect(counts.plainLeaf).toBe(3);
    });
  });

  describe('cascade through context (memo does NOT block context updates)', () => {
    it('context change re-renders the consumer even though intermediates are memo-clean', () => {
      const CountContext = React.createContext(0);
      const ContextReader = styled.div<{ $name: string }>`
        ${(p: any) => {
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

      const { rerender } = render(<Provider value={0} />);
      expect(counts).toEqual({ provider: 1, 'consumer-0': 1, reader: 1 });
      for (const key of Object.keys(counts)) delete counts[key];
      rerender(<Provider value={1} />);
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
      const { StyledLeaf } = makeStyled();
      let setCount!: (n: number) => void;
      function StatefulChild() {
        const [n, set] = React.useState(0);
        setCount = set;
        tally(`stateful-${n}`);
        return <span>{n}</span>;
      }

      render(
        <StyledLeaf $name="parent">
          <StatefulChild />
        </StyledLeaf>
      );
      expect(counts).toEqual({ parent: 1, 'stateful-0': 1 });

      for (const k of Object.keys(counts)) delete counts[k];
      act(() => {
        setCount(1);
      });
      expect(counts).toEqual({ 'stateful-1': 1 });
    });

    it('useReducer in a child re-renders that child only', () => {
      const { StyledLeaf } = makeStyled();
      let dispatch!: () => void;
      function ReducerChild() {
        const [n, d] = React.useReducer((s: number) => s + 1, 0);
        dispatch = d;
        tally(`reducer-${n}`);
        return <span>{n}</span>;
      }

      render(
        <StyledLeaf $name="parent">
          <ReducerChild />
        </StyledLeaf>
      );

      for (const k of Object.keys(counts)) delete counts[k];
      act(() => {
        dispatch();
      });
      expect(counts).toEqual({ 'reducer-1': 1 });
    });

    it('useSyncExternalStore in a child re-renders on emitter event', () => {
      const { StyledLeaf } = makeStyled();
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
        return <span>{v}</span>;
      }

      render(
        <StyledLeaf $name="parent">
          <ExternalSubscriber />
        </StyledLeaf>
      );

      for (const k of Object.keys(counts)) delete counts[k];
      act(() => {
        value = 1;
        for (const cb of subscribers) cb();
      });
      expect(counts).toEqual({ 'external-1': 1 });
    });
  });

  describe('effects in styled subtree fire correctly', () => {
    it('useEffect mount + unmount lifecycle is preserved', () => {
      const { StyledLeaf } = makeStyled();
      const events: string[] = [];
      function ChildWithEffect() {
        React.useEffect(() => {
          events.push('mount');
          return () => events.push('unmount');
        }, []);
        return <span>x</span>;
      }

      const { unmount } = render(
        <StyledLeaf $name="effect-parent">
          <ChildWithEffect />
        </StyledLeaf>
      );
      expect(events).toEqual(['mount']);

      unmount();
      expect(events).toEqual(['mount', 'unmount']);
    });

    it('useEffect deps drive re-fire even with memo above', () => {
      const { StyledLeaf } = makeStyled();
      const events: string[] = [];
      function ChildWithEffect({ trigger }: { trigger: number }) {
        React.useEffect(() => {
          events.push(`effect-${trigger}`);
          return () => events.push(`cleanup-${trigger}`);
        }, [trigger]);
        return <span>{trigger}</span>;
      }

      const { rerender } = render(
        <StyledLeaf $name="effect-deps-parent">
          <ChildWithEffect trigger={1} />
        </StyledLeaf>
      );
      expect(events).toEqual(['effect-1']);

      rerender(
        <StyledLeaf $name="effect-deps-parent">
          <ChildWithEffect trigger={2} />
        </StyledLeaf>
      );
      expect(events).toEqual(['effect-1', 'cleanup-1', 'effect-2']);
    });
  });

  describe('refs work correctly through memo', () => {
    it('createRef receives the underlying element', () => {
      const { StyledLeaf } = makeStyled();
      const ref = React.createRef<HTMLDivElement>();
      render(<StyledLeaf $name="created-ref" ref={ref} />);
      expect(ref.current).not.toBeNull();
      expect(ref.current?.tagName).toBe('DIV');
    });

    it('callback ref fires with the element instance', () => {
      const { StyledLeaf } = makeStyled();
      const refValues: any[] = [];
      const refCallback = (el: any) => {
        if (el) refValues.push(el);
      };
      render(<StyledLeaf $name="callback-ref" ref={refCallback} />);
      expect(refValues.length).toBe(1);
    });

    it('ref instance is stable across memo bails', () => {
      const { StyledLeaf } = makeStyled();
      const ref = React.createRef<HTMLDivElement>();
      const { rerender } = render(<StyledLeaf $name="stable-ref" ref={ref} />);
      const before = ref.current;

      rerender(<StyledLeaf $name="stable-ref" ref={ref} />);
      expect(ref.current).toBe(before);
    });

    it('useImperativeHandle exposes methods', () => {
      const { StyledLeaf } = makeStyled();
      const handle = React.createRef<{ greet: () => string }>();

      const ImperativeChild = React.forwardRef<{ greet: () => string }, { name: string }>(
        ({ name }, ref) => {
          React.useImperativeHandle(ref, () => ({
            greet: () => `hi from ${name}`,
          }));
          return <span>{name}</span>;
        }
      );

      function Parent({ tick, name }: { tick: number; name: string }) {
        return (
          <StyledLeaf $name="imperative-parent">
            <ImperativeChild ref={handle} name={name} />
          </StyledLeaf>
        );
      }

      const { rerender } = render(<Parent tick={1} name="alice" />);
      expect(handle.current?.greet()).toBe('hi from alice');

      rerender(<Parent tick={2} name="alice" />);
      expect(handle.current?.greet()).toBe('hi from alice');
    });
  });

  describe('inline reference props defeat memo (no correctness break, just no perf win)', () => {
    it('inline style object → fresh ref each render → memo never bails', () => {
      const { StyledLeaf } = makeStyled();
      function ParentInline({ tick }: { tick: number }) {
        return <StyledLeaf $name="inline-style" style={{ marginTop: 0 }} />;
      }

      const { rerender } = render(<ParentInline tick={1} />);
      for (const k of Object.keys(counts)) delete counts[k];

      rerender(<ParentInline tick={2} />);
      expect(counts).toEqual({ 'inline-style': 1 });
    });

    it('inline event handler → fresh ref each render → memo never bails', () => {
      const { StyledLeaf } = makeStyled();
      function ParentInline({ tick }: { tick: number }) {
        return <StyledLeaf $name="inline-handler" onClick={() => undefined} />;
      }

      const { rerender } = render(<ParentInline tick={1} />);
      for (const k of Object.keys(counts)) delete counts[k];

      rerender(<ParentInline tick={2} />);
      expect(counts).toEqual({ 'inline-handler': 1 });
    });
  });

  describe('polymorphic as prop', () => {
    it('changing as triggers re-render', () => {
      const { StyledLeaf } = makeStyled();
      function Poly({ as }: { as: any }) {
        return <StyledLeaf $name="poly-leaf" as={as} />;
      }

      const { rerender } = render(<Poly as="div" />);
      for (const k of Object.keys(counts)) delete counts[k];

      rerender(<Poly as="section" />);
      expect(counts).toEqual({ 'poly-leaf': 1 });
    });

    it('stable as prop bails', () => {
      const { StyledLeaf } = makeStyled();
      function StablePoly({ tick }: { tick: number }) {
        return <StyledLeaf $name="stable-poly" as="div" />;
      }

      const { rerender } = render(<StablePoly tick={1} />);
      for (const k of Object.keys(counts)) delete counts[k];

      rerender(<StablePoly tick={2} />);
      expect(counts).toEqual({});
    });
  });

  describe('conditional rendering lifecycle', () => {
    it('mount + unmount via toggle does not corrupt state', () => {
      const { StyledLeaf } = makeStyled();
      function Conditional({ show }: { show: boolean }) {
        return <div>{show && <StyledLeaf $name="conditional-leaf" />}</div>;
      }

      const { rerender } = render(<Conditional show={true} />);
      expect(counts).toEqual({ 'conditional-leaf': 1 });

      for (const k of Object.keys(counts)) delete counts[k];
      rerender(<Conditional show={false} />);
      expect(counts).toEqual({});

      rerender(<Conditional show={true} />);
      expect(counts).toEqual({ 'conditional-leaf': 1 });
    });
  });

  describe('multi-instance independence', () => {
    it('changing one instance prop does not re-render its sibling', () => {
      const { StyledLeaf } = makeStyled();
      function TwoInstances({ leftTick, rightTick }: { leftTick: number; rightTick: number }) {
        return (
          <div>
            <StyledLeaf $name={`left-${leftTick}`} />
            <StyledLeaf $name={`right-${rightTick}`} />
          </div>
        );
      }

      const { rerender } = render(<TwoInstances leftTick={1} rightTick={1} />);
      for (const k of Object.keys(counts)) delete counts[k];

      rerender(<TwoInstances leftTick={2} rightTick={1} />);
      expect(counts['left-2']).toBe(1);
      expect(counts['right-1'] ?? 0).toBe(0);
    });
  });

  describe('Object.is comparison edge cases', () => {
    it('NaN prop bails (Object.is(NaN, NaN) === true)', () => {
      const { StyledLeaf } = makeStyled();
      function ParentWithNaN({ tick }: { tick: number }) {
        return <StyledLeaf $name="nan-leaf" {...({ $value: NaN } as any)} />;
      }

      const { rerender } = render(<ParentWithNaN tick={1} />);
      for (const k of Object.keys(counts)) delete counts[k];

      rerender(<ParentWithNaN tick={2} />);
      expect(counts).toEqual({});
    });
  });

  describe('attrs is correctly memoized (pure function on props)', () => {
    it('attrs is skipped when props are unchanged', () => {
      let attrsCalls = 0;
      const Counter = styled.div.attrs(() => {
        attrsCalls++;
        return {};
      })`
        background: red;
      `;

      function Parent({ tick }: { tick: number }) {
        return <Counter />;
      }

      const { rerender } = render(<Parent tick={1} />);
      expect(attrsCalls).toBe(1);

      rerender(<Parent tick={2} />);
      // attrs is contractually `(props) => attrs` — pure function.
      expect(attrsCalls).toBe(1);
    });

    it('attrs IS called when a prop changes', () => {
      let attrsCalls = 0;
      const PropDriven = styled.div.attrs<{ $tick: number }>(p => {
        attrsCalls++;
        return { id: `tick-${p.$tick}` };
      })`
        background: red;
      `;

      function Parent({ tick }: { tick: number }) {
        return <PropDriven $tick={tick} />;
      }

      const { rerender } = render(<Parent tick={1} />);
      expect(attrsCalls).toBe(1);

      rerender(<Parent tick={2} />);
      expect(attrsCalls).toBe(2);
    });
  });

  describe('CSS interpolation function is correctly memoized (pure function on props/theme)', () => {
    it('interpolation function is skipped when props/theme are unchanged', () => {
      let interpCalls = 0;
      const Themed = styled.div`
        ${() => {
          interpCalls++;
          return 'background: red;';
        }}
      `;

      function Parent({ tick }: { tick: number }) {
        return <Themed />;
      }

      const { rerender } = render(<Parent tick={1} />);
      expect(interpCalls).toBe(1);

      rerender(<Parent tick={2} />);
      expect(interpCalls).toBe(1);
    });
  });

  describe('very deep tree memo bail propagation', () => {
    it('10-level chain with stable subtree skips entirely on parent re-render', () => {
      const { StyledLeaf } = makeStyled();
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
                                <span>deep</span>
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
          <div>
            {inner}
            <span>{payload}</span>
          </div>
        );
      }

      const { rerender } = render(<VeryDeep payload={1} />);
      expect(Object.keys(counts).length).toBe(10);

      for (const k of Object.keys(counts)) delete counts[k];
      rerender(<VeryDeep payload={2} />);
      // useMemo'd subtree → L0 children prop ref is stable → memo bails at L0 →
      // none of L1..L9 are visited.
      expect(counts).toEqual({});
    });
  });

  describe("ThemeProvider updates propagate through memo'd intermediates", () => {
    it('theme change re-renders deep styled component', () => {
      const { StyledContainer } = makeStyled();
      const ThemedLeaf = styled.div<{ $name: string }>`
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

      const { rerender } = render(<App color="red" />);
      expect(counts['themed-red']).toBe(1);

      for (const k of Object.keys(counts)) delete counts[k];
      rerender(<App color="blue" />);
      // Theme via context → consumer below memo'd intermediates re-renders.
      expect(counts['themed-blue']).toBe(1);
    });
  });

  describe('double-memo wrapping (no harm)', () => {
    it('wrapping a styled in another React.memo composes correctly', () => {
      const { StyledLeaf } = makeStyled();
      const DoubleMemo = React.memo<{ $name: string; $tick: number }>(props => (
        <StyledLeaf $name={props.$name} />
      ));
      DoubleMemo.displayName = 'DoubleMemo';

      const { rerender } = render(<DoubleMemo $name="wrapped" $tick={1} />);
      for (const k of Object.keys(counts)) delete counts[k];

      rerender(<DoubleMemo $name="wrapped" $tick={1} />);
      expect(counts).toEqual({});
    });
  });
});
