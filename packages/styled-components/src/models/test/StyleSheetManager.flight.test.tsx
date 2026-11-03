/**
 * @jest-environment node
 * @jest-environment-options {"customExportConditions": ["react-server", "node", "node-addons"]}
 */

// Renders with the real Flight server (react-server-dom-webpack) under the
// `react-server` export condition, so IS_RSC is true without mocking and
// Flight's own task order (size-deferred elements, async resumption) decides
// when each component renders. See docs/react.md "StyleSheetManager and
// configureServerStyles in server components".
import React, { Fragment, Suspense, forwardRef, lazy, memo, type ReactNode } from 'react';
import styled, {
  StyleSheetConsumer,
  StyleSheetManager,
  configureServerStyles,
  createGlobalStyle,
  type IStyleSheetContext,
} from '../../index';
import {
  clientComponent,
  renderFlight,
  temporaryReference,
  type FlightResult,
  type Probe,
} from '../../test/flight';
import type { SCPlugin } from '../../utils/compiler';
import { IS_RSC } from '../../utils/isRsc';
import { useStyleSheetContext } from '../StyleSheetManager';

/** Appends a custom property naming the plugin to every `color` declaration, so a rule shows which plugin styled it. */
const tagging = (name: string): SCPlugin => ({
  decl: (prop, value) =>
    prop === 'color'
      ? [
          { prop, value },
          { prop: `--${name}`, value: 'on' },
        ]
      : undefined,
  name,
});

const outer = tagging('outer');
const inner = tagging('inner');
const configured = tagging('configured');

const Swatch = styled.div`
  color: red;
`;

/** A server component rendering one styled element, found in the payload by `id`. */
const Probe = ({ id }: { id: string }) => <Swatch data-drop="x" data-probe={id} />;

const GlobalInside = createGlobalStyle`
  html {
    color: red;
  }
`;
const GlobalOutside = createGlobalStyle`
  body {
    color: red;
  }
`;

type Scope = { namespace?: string; tag?: string };

/** The rule text a probe must carry in `scope`: the namespace prefix and tag plugin follow from the manager's settings, the class name from the probe's own element. */
const ruleFor = (probe: Probe, { namespace, tag }: Scope): string => {
  const className = probe.className.split(' ').pop();

  return `${namespace ? `${namespace} ` : ''}.${className}{color:red;${tag ? `--${tag}:on;` : ''}}`;
};

/** Asserts exactly the expected probes rendered, each carrying the rule its scope calls for. */
const expectScopes = (result: FlightResult, expected: Record<string, Scope>): void => {
  expect(result.errors).toEqual([]);
  expect(Object.keys(result.probes).sort()).toEqual(Object.keys(expected).sort());
  expect(
    Object.fromEntries(Object.entries(result.probes).map(([id, probe]) => [id, probe.css]))
  ).toEqual(
    Object.fromEntries(
      Object.entries(expected).map(([id, scope]) => [id, ruleFor(result.probes[id], scope)])
    )
  );
};

const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));

/** A node React accepts but the types do not list (a lazy child). */
const asNode = (value: unknown): ReactNode => value as ReactNode;

/** Renders far more than the 3200 bytes after which Flight defers the remaining elements of a row. */
const Filler = () => (
  <div>
    {Array.from({ length: 150 }, (_, index) => (
      <p key={index}>Filler paragraph number {index} of lorem ipsum dolor sit amet</p>
    ))}
  </div>
);

const Frame = clientComponent<{ children?: ReactNode; data?: unknown; slot?: ReactNode }>('Frame');

afterEach(() => {
  configureServerStyles({ plugins: [] });
});

describe('server component environment', () => {
  it('runs with IS_RSC true and no mocks', () => {
    expect(IS_RSC).toBe(true);
  });

  it('styles a component with no manager and no configured plugins as the baseline', async () => {
    const result = await renderFlight(<Probe id="bare" />);

    expectScopes(result, { bare: {} });
  });
});

describe('StyleSheetManager scope by position', () => {
  it('applies a namespaced manager to its content and not to a sibling after it', async () => {
    const result = await renderFlight(
      <>
        <StyleSheetManager namespace="ns">
          <Probe id="inside" />
        </StyleSheetManager>
        <Probe id="outside" />
      </>
    );

    expectScopes(result, { inside: { namespace: 'ns' }, outside: {} });
  });

  it('scopes each nested manager to its own content and restores the parent after it', async () => {
    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <Probe id="first" />
          <StyleSheetManager plugins={[inner]}>
            <Probe id="nested" />
          </StyleSheetManager>
          <Probe id="last" />
        </StyleSheetManager>
        <Probe id="sidebar" />
      </>
    );

    expectScopes(result, {
      first: { tag: 'outer' },
      last: { tag: 'outer' },
      nested: { tag: 'inner' },
      sidebar: {},
    });
  });

  it('applies shouldForwardProp to its content and not to a sibling after it', async () => {
    const result = await renderFlight(
      <>
        <StyleSheetManager shouldForwardProp={prop => prop !== 'data-drop'}>
          <Probe id="inside" />
        </StyleSheetManager>
        <Probe id="outside" />
      </>
    );

    expect(result.errors).toEqual([]);
    expect('data-drop' in result.probes.inside.props).toBe(false);
    expect(result.probes.outside.props['data-drop']).toBe('x');
  });

  it('applies the manager to a global style inside it and not to one outside', async () => {
    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <GlobalInside />
        </StyleSheetManager>
        <GlobalOutside />
      </>
    );

    expect(result.errors).toEqual([]);
    expect([...result.globals].sort()).toEqual(['body{color:red;}', 'html{color:red;--outer:on;}']);
  });

  it('lets a nested manager without plugins keep the parent plugins and add its namespace', async () => {
    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <StyleSheetManager namespace="ns">
            <Probe id="nested" />
          </StyleSheetManager>
        </StyleSheetManager>
        <Probe id="outside" />
      </>
    );

    expectScopes(result, { nested: { namespace: 'ns', tag: 'outer' }, outside: {} });
  });

  it('lets a nested manager with an empty plugin list drop the parent plugins', async () => {
    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <Probe id="before" />
          <StyleSheetManager plugins={[]}>
            <Probe id="nested" />
          </StyleSheetManager>
        </StyleSheetManager>
        <Probe id="outside" />
      </>
    );

    expectScopes(result, { before: { tag: 'outer' }, nested: {}, outside: {} });
  });

  it('keeps the scope for content Flight defers past 3200 bytes, and out of a sibling that renders first', async () => {
    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <Probe id="before" />
          <Filler />
          <Probe id="after" />
        </StyleSheetManager>
        <Probe id="outside" />
      </>
    );

    expectScopes(result, { after: { tag: 'outer' }, before: { tag: 'outer' }, outside: {} });
    // The case only means something when Flight really moved the later probe to its own row.
    expect(result.probes.after.row).not.toBe(result.probes.before.row);
  });

  it('scopes the output of an async component that resumes in a later task', async () => {
    const Late = async () => {
      await tick();

      return <Probe id="late" />;
    };

    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <Late />
        </StyleSheetManager>
        <Probe id="outside" />
      </>
    );

    expectScopes(result, { late: { tag: 'outer' }, outside: {} });
  });

  it('scopes the output of a component that returns a thenable whose then returns nothing', async () => {
    // React's own Wakeable type lets `then` return nothing, and Flight unwraps one returned from a component.
    const source = Promise.resolve(<Probe id="bare-output" />);
    const ReturnsBareThenable = () =>
      ({
        then: (onFulfilled: (value: ReactNode) => void, onRejected: (reason: unknown) => void) => {
          source.then(onFulfilled, onRejected);
        },
      }) as unknown as ReactNode;

    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <ReturnsBareThenable />
        </StyleSheetManager>
        <Probe id="outside" />
      </>
    );

    expectScopes(result, { 'bare-output': { tag: 'outer' }, outside: {} });
  });

  it('reports an error thrown while walking a thenable output instead of leaving the render pending', async () => {
    const broken = {
      [Symbol.iterator]: () => {
        throw new Error('iterator broke');
      },
    };
    const source = Promise.resolve(broken);
    const ReturnsBareThenable = () =>
      ({
        then: (onFulfilled: (value: unknown) => void, onRejected: (reason: unknown) => void) => {
          source.then(onFulfilled, onRejected);
        },
      }) as unknown as ReactNode;

    const result = await renderFlight(
      <StyleSheetManager plugins={[outer]}>
        <ReturnsBareThenable />
      </StyleSheetManager>
    );

    expect(result.errors).toEqual(['iterator broke']);
  }, 2000);

  it('scopes two async subtrees under different managers that resume in the same tick', async () => {
    const gate = tick();
    const Gated = async ({ id }: { id: string }) => {
      await gate;

      return <Probe id={id} />;
    };

    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <Gated id="left" />
        </StyleSheetManager>
        <StyleSheetManager plugins={[inner]}>
          <Gated id="right" />
        </StyleSheetManager>
        <Gated id="outside" />
      </>
    );

    expectScopes(result, { left: { tag: 'outer' }, outside: {}, right: { tag: 'inner' } });
  });

  it('scopes components wrapped in memo, forwardRef and lazy', async () => {
    const Memoized = memo(({ id }: { id: string }) => <Probe id={id} />);
    const Forwarded = forwardRef<HTMLElement, { id: string }>(({ id }, _ref) => <Probe id={id} />);
    const Lazy = lazy(async () => ({ default: Probe }));

    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <Memoized id="memo" />
          <Forwarded id="forwarded" />
          <Lazy id="lazy" />
        </StyleSheetManager>
        <Memoized id="memo-outside" />
        <Forwarded id="forwarded-outside" />
        <Lazy id="lazy-outside" />
      </>
    );

    expectScopes(result, {
      forwarded: { tag: 'outer' },
      'forwarded-outside': {},
      lazy: { tag: 'outer' },
      'lazy-outside': {},
      memo: { tag: 'outer' },
      'memo-outside': {},
    });
  });

  it('scopes an element passed as a prop to the place where it renders', async () => {
    const Panel = ({ slot }: { slot: ReactNode }) => <section>{slot}</section>;
    const slot = <Probe id="slot" />;

    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <Panel slot={slot} />
        </StyleSheetManager>
        <Panel slot={<Probe id="outside" />} />
      </>
    );

    expectScopes(result, { outside: {}, slot: { tag: 'outer' } });
  });

  it('scopes both the Suspense fallback and the resolved content', async () => {
    const Slow = async () => {
      await tick();

      return <Probe id="resolved" />;
    };

    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <Suspense fallback={<Probe id="fallback" />}>
            <Slow />
          </Suspense>
        </StyleSheetManager>
        <Probe id="outside" />
      </>
    );

    expectScopes(result, { fallback: { tag: 'outer' }, outside: {}, resolved: { tag: 'outer' } });
  });

  it('scopes a fulfilled thenable child and a pending one', async () => {
    const element = <Probe id="fulfilled" />;
    const fulfilled = Object.assign(Promise.resolve(element), {
      status: 'fulfilled',
      value: element,
    });
    const pending = new Promise<ReactNode>(resolve =>
      setTimeout(() => resolve(<Probe id="pending" />), 0)
    );

    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          {asNode(fulfilled)}
          {asNode(pending)}
        </StyleSheetManager>
        <Probe id="outside" />
      </>
    );

    expectScopes(result, { fulfilled: { tag: 'outer' }, outside: {}, pending: { tag: 'outer' } });
  });

  it.each([
    ['a host element', 'section'],
    ['a Fragment', Fragment],
  ])('scopes a server component inside a lazy type that resolves to %s', async (_, resolved) => {
    const Resolved = lazy(async () => ({ default: resolved as never }));

    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <Resolved>
            <Probe id="inside" />
          </Resolved>
        </StyleSheetManager>
        <Resolved>
          <Probe id="outside" />
        </Resolved>
      </>
    );

    expectScopes(result, { inside: { tag: 'outer' }, outside: {} });
  });

  it('leaves a temporary reference as the element type instead of calling it', async () => {
    const reference = await temporaryReference();
    const rewritten = StyleSheetManager({
      children: React.createElement(reference as never, { id: 'client-value' }),
      plugins: [outer],
    });
    const child: unknown = rewritten.props.children;

    // Compared with Object.is: a temporary reference throws on any property read a matcher makes.
    expect(React.isValidElement(child) && Object.is(child.type, reference)).toBe(true);
  });

  it('scopes a pending thenable whose then returns nothing, and keeps it scoped when it is used twice', async () => {
    // Promises/A+ duck typing allows `then` to return undefined; React's own Flight client chunk does.
    const source = Promise.resolve(<Probe id="bare-then" />);
    const bare = {
      then: (onFulfilled: (value: ReactNode) => void, onRejected: (reason: unknown) => void) => {
        source.then(onFulfilled, onRejected);
      },
    };

    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <Frame data={bare} slot={bare} />
        </StyleSheetManager>
        <Probe id="outside" />
      </>
    );

    expectScopes(result, { 'bare-then': { tag: 'outer' }, outside: {} });
  });

  it('leaves no unhandled rejection when a rejected promise child is never read', async () => {
    const unhandled: unknown[] = [];
    const listener = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', listener);

    try {
      let reject: (reason: unknown) => void = () => {};
      const source = new Promise<ReactNode>((_, rejectSource) => {
        reject = rejectSource;
      });

      // Called directly: a render aborted before the row is written never subscribes to the child.
      StyleSheetManager({ children: asNode(source), plugins: [outer] });
      reject(new Error('source failed'));
      await tick();
      await tick();

      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', listener);
    }
  });

  it('still passes a rejection on to a reader of the derived promise', async () => {
    const source = new Promise<ReactNode>((_, reject) =>
      setTimeout(() => reject(new Error('source failed')), 0)
    );

    const rewritten = StyleSheetManager({ children: asNode(source), plugins: [outer] });
    const derived: unknown = rewritten.props.children;

    expect(derived).toBeInstanceOf(Promise);
    await expect(derived).rejects.toThrow('source failed');
  });

  it('rejects the derived promise when walking the resolved value throws', async () => {
    const source = Promise.resolve({
      get broken(): never {
        throw new Error('getter broke');
      },
    });

    const rewritten = StyleSheetManager({ children: asNode(source), plugins: [outer] });
    const derived: unknown = rewritten.props.children;
    const pending = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('still pending')), 100)
    );

    await expect(Promise.race([derived, pending])).rejects.toThrow('getter broke');
  });

  describe('iterables in a children position', () => {
    // Two items of one component share a rule, so the second carries no style tag; the scope is read through the consumer instead.
    const seen: Record<string, string[] | undefined> = {};
    const Reader = ({ id }: { id: string }) => (
      <StyleSheetConsumer>
        {(context: IStyleSheetContext) => {
          seen[id] = context.plugins?.map(plugin => plugin.name);

          return <i data-reader={id} />;
        }}
      </StyleSheetConsumer>
    );
    const readers = () => [<Reader key="a" id="item-a" />, <Reader key="b" id="item-b" />];

    function* generated() {
      yield* readers();
    }
    async function* streamed() {
      yield* readers();
    }

    beforeEach(() => {
      for (const id of Object.keys(seen)) delete seen[id];
    });

    // Flight renders the items of an async iterable with no hook dispatcher installed, so a hook call there throws.
    it.each([
      ['outside any manager', (node: ReactNode) => node, {}],
      [
        'under a manager',
        (node: ReactNode) => <StyleSheetManager plugins={[outer]}>{node}</StyleSheetManager>,
        { tag: 'outer' },
      ],
    ])('renders a styled component yielded by an async iterable %s', async (_, wrap, scope) => {
      async function* swatches() {
        yield <Swatch key="a" data-probe="streamed" />;
      }

      const result = await renderFlight(wrap(asNode(swatches())));

      expectScopes(result, { streamed: scope });
    });

    // A generator passed as JSX children is drained by React's own key check in development, so it is returned by a component.
    const FromSet = () => asNode(new Set(readers()));
    const FromGenerator = () => asNode(generated());

    it.each([
      ['a Set as children', () => asNode(new Set(readers()))],
      ['an async generator as children', () => asNode(streamed())],
      ['a Set returned by a component', () => <FromSet />],
      ['a generator returned by a component', () => <FromGenerator />],
    ])('scopes the elements of %s', async (_, makeContent) => {
      const result = await renderFlight(
        <>
          <StyleSheetManager plugins={[outer]}>{makeContent()}</StyleSheetManager>
          <Reader id="outside" />
        </>
      );

      expect(result.errors).toEqual([]);
      expect(seen).toEqual({ 'item-a': ['outer'], 'item-b': ['outer'], outside: undefined });
    });
  });

  it('scopes the result of a lazy node', async () => {
    // Flight hangs on a `React.lazy` node whose loader is async (with or without a manager), so the node resolves synchronously.
    const node = {
      $$typeof: Symbol.for('react.lazy'),
      _init: (payload: { value: ReactNode }) => payload.value,
      _payload: { reason: null, status: 'fulfilled', value: <Probe id="lazy-node" /> },
    };

    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>{asNode(node)}</StyleSheetManager>
        <Probe id="outside" />
      </>
    );

    expectScopes(result, { 'lazy-node': { tag: 'outer' }, outside: {} });
  });
});

describe('StyleSheetManager scope for a reused element', () => {
  /** How many times the probe's element is written out; Flight writes a repeated object as a reference instead. */
  const writes = (result: FlightResult, id: string) =>
    result.payload.split(`"data-probe":"${id}"`).length - 1;

  it.each([
    [
      'a host element holding a server component',
      <section key="s">
        <Probe id="shared" />
      </section>,
    ],
    [
      'a client component holding a server component',
      <Frame key="s" slot={<Probe id="shared" />} />,
    ],
  ])(
    'writes %s rendered in two places as often as Flight does without a manager',
    async (_, shared) => {
      const unmanaged = await renderFlight(
        <>
          {shared}
          {shared}
        </>
      );
      const managed = await renderFlight(
        <StyleSheetManager plugins={[outer]}>
          {shared}
          {shared}
        </StyleSheetManager>
      );

      expect(writes(managed, 'shared')).toBe(writes(unmanaged, 'shared'));
      expectScopes(managed, { shared: { tag: 'outer' } });
    }
  );
});

describe('StyleSheetManager scope across a client component', () => {
  it('reaches server elements in the children, in another prop, and in a nested object', async () => {
    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <Frame data={{ deep: { probe: <Probe id="nested" /> } }} slot={<Probe id="slot" />}>
            <Probe id="child" />
          </Frame>
        </StyleSheetManager>
        <Frame slot={<Probe id="outside" />} />
      </>
    );

    expectScopes(result, {
      child: { tag: 'outer' },
      nested: { tag: 'outer' },
      outside: {},
      slot: { tag: 'outer' },
    });
  });

  it('renders a cyclic prop object without crashing and still scopes the server element inside it', async () => {
    const data: Record<string, unknown> = {};
    data.self = data;
    data.probe = <Probe id="cyclic" />;

    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <Frame data={data} />
        </StyleSheetManager>
        <Probe id="outside" />
      </>
    );

    expectScopes(result, { cyclic: { tag: 'outer' }, outside: {} });
  });

  it('renders a cycle that passes through a client element without crashing', async () => {
    const data: Record<string, unknown> = {};
    data.element = <Frame data={data} />;
    data.probe = <Probe id="cyclic-element" />;

    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <Frame data={data} />
        </StyleSheetManager>
        <Probe id="outside" />
      </>
    );

    expectScopes(result, { 'cyclic-element': { tag: 'outer' }, outside: {} });
  });

  it('copies an own __proto__ key of a prop object as data, without changing the prototype', async () => {
    // JSON.parse makes `__proto__` an own data key; assigning it to the copy would set the copy's prototype instead.
    const data: Record<string, unknown> = JSON.parse('{"__proto__":{"polluted":true}}');
    data.probe = <Probe id="proto-key" />;

    const result = await renderFlight(
      <StyleSheetManager plugins={[outer]}>
        <Frame data={data} />
      </StyleSheetManager>
    );

    expectScopes(result, { 'proto-key': { tag: 'outer' } });
    const [props] = result.clientProps;
    expect(Object.keys(Object(props.data))).toEqual(['__proto__', 'probe']);
    expect(Reflect.get(Object(props.data), '__proto__')).toEqual({ polluted: true });
  });

  it('keeps a promise prop a promise, so a client component can still read it with use()', async () => {
    const shared = Promise.resolve({ ready: true });
    const Reads = async () => {
      await shared;

      return <Probe id="reads" />;
    };

    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <Frame data={shared} />
          <Reads />
        </StyleSheetManager>
        <Probe id="outside" />
      </>
    );

    expectScopes(result, { outside: {}, reads: { tag: 'outer' } });
    expect(result.clientProps.map(props => String(props.data).startsWith('$@'))).toEqual([true]);
  });

  it('scopes a server element resolved inside a promise prop', async () => {
    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <Frame data={Promise.resolve(<Probe id="promised" />)} />
        </StyleSheetManager>
        <Probe id="outside" />
      </>
    );

    expectScopes(result, { outside: {}, promised: { tag: 'outer' } });
  });
});

describe('StyleSheetConsumer in server components', () => {
  it('reads the scope of the place where it renders', async () => {
    const seen: Record<string, string[] | undefined> = {};
    const Reader = ({ id }: { id: string }) => (
      <StyleSheetConsumer>
        {(context: IStyleSheetContext) => {
          seen[id] = context.plugins?.map(plugin => plugin.name);

          return <Probe id={id} />;
        }}
      </StyleSheetConsumer>
    );

    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <Reader id="inside" />
        </StyleSheetManager>
        <Reader id="outside" />
      </>
    );

    expectScopes(result, { inside: { tag: 'outer' }, outside: {} });
    expect(seen).toEqual({ inside: ['outer'], outside: undefined });
  });

  it('gives a read after an await the server defaults, while the elements the component returns keep its scope', async () => {
    const seen: Record<string, string[] | undefined> = {};
    const Awaiting = async () => {
      seen.before = useStyleSheetContext().plugins?.map(plugin => plugin.name);
      await Promise.resolve();
      seen.after = useStyleSheetContext().plugins?.map(plugin => plugin.name);

      return <Probe id="returned" />;
    };

    const result = await renderFlight(
      <StyleSheetManager plugins={[outer]}>
        <Awaiting />
      </StyleSheetManager>
    );

    expectScopes(result, { returned: { tag: 'outer' } });
    expect(seen).toEqual({ after: undefined, before: ['outer'] });
  });
});

describe('StyleSheetManager compiler sharing', () => {
  const compilers: Record<string, unknown> = {};
  const Reader = ({ id }: { id: string }) => (
    <StyleSheetConsumer>
      {(context: IStyleSheetContext) => {
        compilers[id] = context.compiler;

        return <i data-reader={id} />;
      }}
    </StyleSheetConsumer>
  );

  beforeEach(() => {
    for (const id of Object.keys(compilers)) delete compilers[id];
  });

  it('shares one compiler between managers whose inline plugin lists hold the same plugins', async () => {
    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <Reader id="first" />
        </StyleSheetManager>
        <StyleSheetManager plugins={[outer]}>
          <Reader id="second" />
        </StyleSheetManager>
      </>
    );

    expect(result.errors).toEqual([]);
    expect(compilers.first).toBeDefined();
    expect(compilers.second).toBe(compilers.first);
  });

  it.each([
    ['a different plugin', () => [inner], undefined],
    ['the same plugins in another order', () => [inner, outer], undefined],
    ['a namespace', () => [outer], 'ns'],
  ])('gives a manager with %s its own compiler', async (_, makePlugins, namespace) => {
    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <Reader id="first" />
        </StyleSheetManager>
        <StyleSheetManager namespace={namespace} plugins={makePlugins()}>
          <Reader id="second" />
        </StyleSheetManager>
      </>
    );

    expect(result.errors).toEqual([]);
    expect(compilers.second).not.toBe(compilers.first);
  });
});

describe('configureServerStyles', () => {
  it('styles a component that has no manager with the configured plugins', async () => {
    configureServerStyles({ plugins: [configured] });

    const result = await renderFlight(<Probe id="bare" />);

    expectScopes(result, { bare: { tag: 'configured' } });
  });

  it('lets a manager inherit the configured plugins when it sets only a namespace', async () => {
    configureServerStyles({ plugins: [configured] });

    const result = await renderFlight(
      <StyleSheetManager namespace="ns">
        <Probe id="inside" />
      </StyleSheetManager>
    );

    expectScopes(result, { inside: { namespace: 'ns', tag: 'configured' } });
  });

  it('lets a manager replace the configured plugins, and drop them with an empty list', async () => {
    configureServerStyles({ plugins: [configured] });

    const result = await renderFlight(
      <>
        <StyleSheetManager plugins={[outer]}>
          <Probe id="replaced" />
        </StyleSheetManager>
        <StyleSheetManager plugins={[]}>
          <Probe id="dropped" />
        </StyleSheetManager>
        <Probe id="outside" />
      </>
    );

    expectScopes(result, {
      dropped: {},
      outside: { tag: 'configured' },
      replaced: { tag: 'outer' },
    });
  });

  it('reaches server components from a separate copy of the library, loaded into the same process', async () => {
    jest.isolateModules(() => {
      const separateCopy: typeof import('../../index') = require('../../index');

      expect(separateCopy.configureServerStyles).not.toBe(configureServerStyles);
      separateCopy.configureServerStyles({ plugins: [configured] });
    });

    const result = await renderFlight(<Probe id="bare" />);

    expectScopes(result, { bare: { tag: 'configured' } });
  });

  it('uses the last call', async () => {
    configureServerStyles({ plugins: [configured] });
    configureServerStyles({ plugins: [outer] });

    const result = await renderFlight(<Probe id="bare" />);

    expectScopes(result, { bare: { tag: 'outer' } });
  });

  it('styles later renders with a changed configuration', async () => {
    configureServerStyles({ plugins: [configured] });
    const first = await renderFlight(<Probe id="bare" />);

    configureServerStyles({ plugins: [] });
    const second = await renderFlight(<Probe id="bare" />);

    expectScopes(first, { bare: { tag: 'configured' } });
    expectScopes(second, { bare: {} });
  });
});
