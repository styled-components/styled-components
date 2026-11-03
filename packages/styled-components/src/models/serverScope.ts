import React from 'react';
import type { IStyleSheetContext } from './StyleSheetManager';

/*
 * Position-based scope for `StyleSheetManager` in server components, which have
 * no context. A manager rewrites its children so each server component inside
 * renders through a wrapper that carries the manager's scope. Contract and
 * rationale: docs/react.md "StyleSheetManager and configureServerStyles in
 * server components".
 */

type Scope = IStyleSheetContext;

/**
 * One manager render's rewrite. Wrappers close over it, so nothing global maps
 * props or scopes to state: weak-map entries per element measured as a
 * large share of a page-sized walk, mostly in garbage collection.
 */
type Walk = {
  /** The result of walking each node, so shared nodes and cycles resolve to one result. */
  memo: Map<object, unknown>;
  scope: Scope;
  /** Original component type to its wrapper in this walk. */
  wrapperOf: Map<object, (props: object) => unknown>;
};

const CLIENT_REFERENCE = /*#__PURE__*/ Symbol.for('react.client.reference');
const FORWARD_REF = /*#__PURE__*/ Symbol.for('react.forward_ref');
const LAZY = /*#__PURE__*/ Symbol.for('react.lazy');
const MEMO = /*#__PURE__*/ Symbol.for('react.memo');
const TEMPORARY_REFERENCE = /*#__PURE__*/ Symbol.for('react.temporary.reference');

/** The memo entry of a container whose fields are being walked. */
const OPEN = /*#__PURE__*/ {};

/** Every wrapper, so an element a nearer manager already scoped is left alone. */
const wrappers = /*#__PURE__*/ new WeakSet<object>();

let current: Scope | null = null;

/** The scope of the server component whose body is running right now, or null outside a scoped component. */
export function currentScope(): Scope | null {
  return current;
}

/** True for anything that can hold properties, functions included (component types are functions). */
function isObject(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return isObject(value) && 'then' in value && typeof value.then === 'function';
}

function create(type: unknown, props: object): unknown {
  return Reflect.apply(React.createElement, React, [type, props]);
}

function clone(element: object, props: object): unknown {
  return Reflect.apply(React.cloneElement, React, [element, props]);
}

/**
 * Read once: unbundled, `__DEV__` is a `process.env` lookup, and at one per
 * rebuilt element it measured a third of the walk's cost.
 */
const IS_DEV = __DEV__;

/** Carries React's development key-validation mark over to a rebuilt element, so it does not warn again. */
function copyValidation(from: object, to: unknown): void {
  if (!IS_DEV || !isObject(to)) return;

  const fromStore = Reflect.get(from, '_store');
  const toStore = Reflect.get(to, '_store');
  if (isObject(fromStore) && isObject(toStore)) {
    Reflect.set(toStore, 'validated', Reflect.get(fromStore, 'validated'));
  }
}

/** A client reference, or a temporary reference (a value a server action received from the client); neither runs on the server. */
function isClientReference(type: unknown): boolean {
  if (typeof type !== 'function') return false;

  const tag = Reflect.get(type, '$$typeof');

  return tag === CLIENT_REFERENCE || tag === TEMPORARY_REFERENCE;
}

/** True for a function component, or a memo, forwardRef or lazy type, that is not a client reference. */
function isServerComponentType(type: unknown): boolean {
  if (typeof type === 'function') return !isClientReference(type);
  if (!isObject(type)) return false;

  const tag = Reflect.get(type, '$$typeof');

  return tag === MEMO || tag === FORWARD_REF || tag === LAZY;
}

function nameOf(type: unknown): string {
  if (!isObject(type)) return 'Component';
  if (typeof type === 'function') {
    const displayName = Reflect.get(type, 'displayName');

    return (typeof displayName === 'string' && displayName) || type.name || 'Component';
  }

  const tag = Reflect.get(type, '$$typeof');
  if (tag === MEMO) return nameOf(Reflect.get(type, 'type'));
  if (tag === FORWARD_REF) {
    const displayName = Reflect.get(type, 'displayName');

    return typeof displayName === 'string' ? displayName : nameOf(Reflect.get(type, 'render'));
  }

  return 'Lazy';
}

/** Runs a component of any server type synchronously with `props`. */
function render(type: unknown, props: object): unknown {
  if (typeof type === 'function') {
    return isClientReference(type) ? create(type, props) : type(props);
  }
  // A host string or a symbol type (Fragment) a lazy type resolved to renders as the element Flight would build.
  if (!isObject(type)) return create(type, props);

  const tag = Reflect.get(type, '$$typeof');
  if (tag === MEMO) return render(Reflect.get(type, 'type'), props);
  if (tag === FORWARD_REF) {
    const forwarded = Reflect.get(type, 'render');

    return typeof forwarded === 'function' ? forwarded(props, undefined) : null;
  }
  if (tag === LAZY) {
    const init = Reflect.get(type, '_init');

    return typeof init === 'function' ? render(init(Reflect.get(type, '_payload')), props) : null;
  }

  return create(type, props);
}

/** Called once per type and walk; later elements of the type find the wrapper in `state.wrapperOf`. */
function createWrapper(type: object, state: Walk): (props: object) => unknown {
  const wrapper = Object.assign(
    function ScopedComponent(props: object): unknown {
      const previous = current;
      current = state.scope;
      let output: unknown;
      try {
        // A wrapped function is never a client reference, so it is called without the check.
        output = typeof type === 'function' ? type(props) : render(type, props);
      } finally {
        current = previous;
      }

      if (!isThenable(output)) return walkChildren(output, state);

      // Adopted rather than chained: a thenable's own `then` may return nothing, and a throw while walking must reject what Flight holds.
      return Promise.resolve(output).then(resolved => walkChildren(resolved, state));
    },
    { displayName: nameOf(type) }
  );
  state.wrapperOf.set(type, wrapper);
  wrappers.add(wrapper);

  return wrapper;
}

function fulfilledThenable(value: unknown): PromiseLike<unknown> {
  return Object.assign(Promise.resolve(value), { status: 'fulfilled', value });
}

/** Like `walkContainer`, by index: a string key on an array takes V8's slow element path. */
function walkArray(original: unknown[], state: Walk): unknown {
  const { memo } = state;
  const { length } = original;

  // Opened at the first object item: primitives walk to themselves and close no cycle, so an array of them (`['Card ', 3]`) needs no memo entry.
  let open = false;
  let copy: unknown[] | undefined;
  for (let i = 0; i < length; i++) {
    const before = original[i];
    if (!isObject(before)) {
      if (copy) copy[i] = before;
      continue;
    }
    if (!open) {
      memo.set(original, OPEN);
      open = true;
    }

    const after = walkIn(before, state);
    if (copy) {
      copy[i] = after;
    } else if (after !== before) {
      // The copy starts at the first changed item; a cycle may have created it already.
      const shell = memo.get(original);
      copy = Array.isArray(shell) ? shell : new Array(length);
      memo.set(original, copy);
      for (let j = 0; j < i; j++) copy[j] = original[j];
      copy[i] = after;
    }
  }
  if (copy) return copy;
  if (open) memo.set(original, original);

  return original;
}

/** Writes an own data field; assigning an own `__proto__` key (as `JSON.parse` makes) would set the copy's prototype instead. */
function copyField(target: object, key: string, value: unknown): void {
  if (key === '__proto__') {
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: true,
      value,
      writable: true,
    });
  } else {
    Reflect.set(target, key, value);
  }
}

/** Like `walkArray`: opened at the first object field; the clone exists from the first changed field, or from a cycle's back-edge. */
function walkContainer(original: object, state: Walk) {
  const { memo } = state;
  const keys = Object.keys(original);

  let open = false;
  let copy: object | undefined;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const before = Reflect.get(original, key);
    if (!isObject(before)) {
      if (copy) copyField(copy, key, before);
      continue;
    }
    if (!open) {
      memo.set(original, OPEN);
      open = true;
    }

    const after = walkIn(before, state);
    if (copy) {
      copyField(copy, key, after);
    } else if (after !== before) {
      const shell = memo.get(original);
      const target: object =
        shell === OPEN || !isObject(shell) ? Object.create(Object.getPrototypeOf(original)) : shell;
      copy = target;
      memo.set(original, target);
      for (let j = 0; j < i; j++) copyField(target, keys[j], Reflect.get(original, keys[j]));
      copyField(target, key, after);
    }
  }
  if (copy) return copy;
  if (open) memo.set(original, original);

  return original;
}

/** What a back-edge to a container still being walked resolves to: an empty clone that the container fills once a field changes (a cycle always changes one). */
function backEdge(node: object, state: Walk): object {
  const shell = Array.isArray(node)
    ? new Array(node.length)
    : Object.create(Object.getPrototypeOf(node));
  state.memo.set(node, shell);

  return shell;
}

function wrap(
  node: React.ReactElement<Record<string, unknown>>,
  wrapper: (props: object) => unknown
) {
  const { key, props } = node;
  const wrapped = create(wrapper, key === null ? props : { ...props, key });
  copyValidation(node, wrapped);

  return wrapped;
}

function walkElement(node: React.ReactElement<Record<string, unknown>>, state: Walk) {
  const { type } = node;
  if (typeof type === 'string' || !isObject(type)) return walkInPlace(node, state);

  // A type this walk already wrapped is a server component; skip the type checks below.
  const known = state.wrapperOf.get(type);
  if (known) return wrap(node, known);

  // A nearer manager already scoped this element.
  if (wrappers.has(type)) return node;

  if (isClientReference(type)) {
    const { props } = node;
    const walked = walkIn(props, state);
    if (walked === props || !isObject(walked)) return node;

    const rebuilt = clone(node, walked);
    copyValidation(node, rebuilt);

    return rebuilt;
  }

  if (isServerComponentType(type)) return wrap(node, createWrapper(type, state));

  return walkInPlace(node, state);
}

/** Host and symbol types (Fragment, Suspense, Activity): their content renders in place. */
function walkInPlace(node: React.ReactElement<Record<string, unknown>>, state: Walk) {
  const { children, fallback } = node.props;
  const nextChildren = walkChildren(children, state);
  const nextFallback = fallback === undefined ? fallback : walkChildren(fallback, state);
  if (nextChildren === children && nextFallback === fallback) return node;

  const rebuilt = clone(
    node,
    nextFallback === fallback
      ? { children: nextChildren }
      : nextChildren === children
        ? { fallback: nextFallback }
        : { children: nextChildren, fallback: nextFallback }
  );
  copyValidation(node, rebuilt);

  return rebuilt;
}

/** An iterable that is not an array and that Flight renders as children; a Map and binary data are data, not children. */
function isChildIterable(node: object): node is Iterable<unknown> {
  return (
    typeof Reflect.get(node, Symbol.iterator) === 'function' &&
    !Array.isArray(node) &&
    !(node instanceof Map) &&
    !ArrayBuffer.isView(node)
  );
}

function isAsyncIterable(node: object): node is AsyncIterable<unknown> {
  return typeof Reflect.get(node, Symbol.asyncIterator) === 'function';
}

async function* walkAsync(source: AsyncIterable<unknown>, state: Walk) {
  for await (const value of source) yield walkChildren(value, state);
}

/**
 * Walks a value in a children position (element children, a fallback, a component's output).
 * An iterable there becomes an array, or an async generator of walked values, so the server
 * components inside are scoped; the same iterable inside a client component's props is data
 * the client receives with its own type, and `walkIn` leaves it alone.
 */
function walkChildren(node: unknown, state: Walk): unknown {
  if (!isObject(node) || Array.isArray(node) || React.isValidElement(node))
    return walkIn(node, state);

  const known = state.memo.get(node);
  if (known !== undefined) return known === OPEN ? backEdge(node, state) : known;

  if (isChildIterable(node)) {
    // A one-shot iterator is read once, so the array is what every later use of it resolves to.
    // A fresh array has no memo entry, so it skips the lookup in `walkIn`.
    const result = walkArray(Array.from(node), state);
    state.memo.set(node, result);

    return result;
  }

  if (isAsyncIterable(node)) {
    const result = walkAsync(node, state);
    state.memo.set(node, result);

    return result;
  }

  return walkIn(node, state);
}

/**
 * A minifier inlines a single-use helper called here as a function expression built on
 * every call, which measured the rows workload 1.6x slower. So each per-node helper has
 * a second caller, is written out in place, or carries `__NOINLINE__` at a call that
 * stays in expression position in the built bundle (one after `return` loses it).
 */
function walkIn(node: unknown, state: Walk): unknown {
  if (!isObject(node)) return node;

  // Every walked object resolves to an object, so undefined means not yet walked.
  const { memo } = state;
  const known = memo.get(node);
  if (known !== undefined) return known === OPEN ? backEdge(node, state) : known;

  if (Array.isArray(node)) return walkArray(node, state);

  if (React.isValidElement<Record<string, unknown>>(node)) {
    const result = /*#__NOINLINE__*/ walkElement(node, state);
    // An unchanged element walks to itself again, so only a rebuilt one needs remembering.
    if (result !== node) memo.set(node, result);

    return result;
  }

  if (isThenable(node)) {
    const status = Reflect.get(node, 'status');
    if (status === 'rejected') return node;

    if (status === 'fulfilled') {
      const value = Reflect.get(node, 'value');
      const walked = walkIn(value, state);
      const result = walked === value ? node : fulfilledThenable(walked);
      memo.set(node, result);

      return result;
    }

    // Adopted rather than chained, as for a thenable output; a derived promise nobody reads must not crash on a rejection.
    const derived = Promise.resolve(node).then(value => walkIn(value, state));
    derived.catch(() => {});
    memo.set(node, derived);

    return derived;
  }

  if (Reflect.get(node, '$$typeof') === LAZY) {
    const init = Reflect.get(node, '_init');
    const result = {
      $$typeof: LAZY,
      _init: (payload: unknown) => walkIn(typeof init === 'function' ? init(payload) : null, state),
      _payload: Reflect.get(node, '_payload'),
    };
    memo.set(node, result);

    return result;
  }

  const prototype = Object.getPrototypeOf(node);

  return prototype === Object.prototype || prototype === null
    ? /*#__NOINLINE__*/ walkContainer(node, state)
    : node;
}

/**
 * Rewrites `children` so every server component inside renders in `scope`.
 * The rewrite keeps the shape of the tree, so the result stands wherever
 * `children` did.
 */
export function scopeChildren(children: React.ReactNode, scope: Scope): React.ReactNode;
export function scopeChildren(children: unknown, scope: Scope): unknown {
  if (!isObject(children)) return children;

  return walkChildren(children, { memo: new Map(), scope, wrapperOf: new Map() });
}
