/**
 * Arity-2 attrs (`(props, ast) => ...`): the `ast` accessor handed to the
 * callback, the construction-time trace that folds a callback into a static
 * plan, and the render-time loop that applies plans or invokes the callbacks
 * the trace could not fold.
 *
 * The trace runs the callback once with a props Proxy and an `ast` that
 * resolves only static declarations; whatever it returns is the plan, so
 * `ast.pop('color') ?? 'fallback'` or `'#' + ast.peek('color')` yield the
 * same bytes the render path would. The trace bails to render-time
 * invocation (a `null` plan) when the callback throws, reads any prop, reads
 * a theme path or a templated declaration, or returns a non-object.
 */
import { NodeKind, type Root } from '../parser/ast';
import { fieldText } from '../parser/compile';
import { isCustomProperty } from '../parser/parser';
import type { CompiledAst, Dict } from '../types';

export interface PostAttrsPlan {
  /**
   * Pre-computed bag of element props to merge into context at render time.
   * @internal
   */
  output: Dict<unknown>;
  /**
   * Keys the callback popped, as written: inline `unset` on web, removed from the style on native.
   * @internal
   */
  popped: ReadonlySet<string> | null;
}

/** Resolves a declaration key or dotted theme path for a render; `undefined` when absent. */
type PostAttrsLookup = (keyOrPath: string) => unknown;

/**
 * Resolves a declaration key at construction: the static value, `undefined`
 * when absent, or `null` when the value is only knowable at render time.
 */
type StaticDeclLookup = (prop: string) => string | undefined | null;

/** What a platform supplies to {@link applyPostAttrs} for one render. */
interface PostAttrsHost<Context extends object> {
  /** @internal */
  lookup: PostAttrsLookup;
  /**
   * Merge a callback's or plan's output into the context (attrs always win).
   * @internal
   */
  merge: (context: Context, resolved: Dict<unknown>) => void;
  /**
   * Record a popped declaration key, as the author spelled it; each host
   * normalizes the spelling it needs.
   * @internal
   */
  onPop: (key: string) => void;
}

type PostAttrCallback = (p: object, ast: CompiledAst) => unknown;

/** True for an arity-2 attrs entry, the form that receives `ast`. */
export function isPostAttr(attr: unknown): attr is PostAttrCallback {
  return typeof attr === 'function' && attr.length >= 2;
}

/** True when any entry in the attrs chain is an arity-2 callback. */
export function hasPostAttrs(attrs: ReadonlyArray<unknown>): boolean {
  for (let i = 0; i < attrs.length; i++) {
    if (isPostAttr(attrs[i])) return true;
  }
  return false;
}

/** Convert a kebab-case CSS prop to its camelCase form (no allocation when already camel); a custom property (`--x`) stays verbatim. */
export function camelizeProp(prop: string): string {
  if (isCustomProperty(prop)) return prop;
  if (prop.indexOf('-') === -1) return prop;
  let out = '';
  let toUpper = false;
  for (let i = 0; i < prop.length; i++) {
    const c = prop[i];
    if (c === '-') {
      toUpper = true;
      continue;
    }
    out += toUpper ? c.toUpperCase() : c;
    toUpper = false;
  }
  return out;
}

/**
 * Value of the last top-level declaration matching `prop` (the cascade
 * winner). `undefined`: no such declaration. `null`: the value is not
 * knowable here, because it is templated and `filled` is `null`, or because
 * it matched only through the camelCase form, where a native polyfill may
 * transform the runtime value.
 */
export function findBaseDecl(
  ast: Root,
  prop: string,
  filled: ReadonlyArray<string> | null
): string | undefined | null {
  const camelTarget = camelizeProp(prop);
  let found: string | undefined | null;
  for (let i = 0; i < ast.length; i++) {
    const node = ast[i];
    if (node.kind !== NodeKind.Decl || typeof node.prop !== 'string') continue;
    if (node.prop !== prop) {
      if (camelizeProp(node.prop) === camelTarget) found = null;
      continue;
    }
    const v = node.value;
    found = typeof v === 'string' ? v : filled === null ? null : fieldText(v, filled);
  }
  return found;
}

/**
 * The `ast` handed to an arity-2 callback. Keys reach the host verbatim as
 * the author spelled them. Each key resolves once per accessor, so a pop
 * stays idempotent and a peek after a pop still reads the value; a pop of a
 * present declaration key reports through `onPop`.
 */
function createAstAccessor(lookup: PostAttrsLookup, onPop: (key: string) => void): CompiledAst {
  const cache = new Map<string, unknown>();
  const get = (keyOrPath: string): unknown => {
    let v: unknown = cache.get(keyOrPath);
    if (v !== undefined || cache.has(keyOrPath)) return v;
    v = lookup(keyOrPath);
    cache.set(keyOrPath, v);
    return v;
  };
  return {
    pop(keyOrPath: string, fallback?: unknown): unknown {
      const v = get(keyOrPath);
      if (v !== undefined && keyOrPath.indexOf('.') === -1) onPop(keyOrPath);
      return v !== undefined ? v : fallback;
    },
    peek(keyOrPath: string, fallback?: unknown): unknown {
      const v = get(keyOrPath);
      return v !== undefined ? v : fallback;
    },
  } as CompiledAst;
}

/**
 * Trace each arity-2 callback in `attrs` against the static declarations
 * `find` resolves. Output is parallel-indexed with the arity-2 entries in
 * iteration order; a `null` slot means the render path invokes the callback.
 */
export function buildPostAttrsPlans(
  attrs: ReadonlyArray<unknown>,
  find: StaticDeclLookup
): ReadonlyArray<PostAttrsPlan | null> {
  const plans: (PostAttrsPlan | null)[] = [];
  for (let i = 0; i < attrs.length; i++) {
    const a = attrs[i];
    if (isPostAttr(a)) plans.push(tracePostAttr(a, find));
  }
  return plans;
}

function tracePostAttr(attr: PostAttrCallback, find: StaticDeclLookup): PostAttrsPlan | null {
  let bailed = false;
  // Empty target so unknown reads return undefined cleanly. Only the `get`
  // trap is needed: `has` and `ownKeys` short-circuit on an empty target.
  const propsProxy = new Proxy(
    {},
    {
      get(_, prop) {
        if (typeof prop !== 'symbol') bailed = true;
        return undefined;
      },
    }
  );
  let popped: Set<string> | null = null;
  const ast = createAstAccessor(
    keyOrPath => {
      const v = keyOrPath.indexOf('.') === -1 ? find(keyOrPath) : null;
      if (v === null) bailed = true;
      return v === null ? undefined : v;
    },
    key => {
      if (popped === null) popped = new Set();
      popped.add(key);
    }
  );

  let result: unknown;
  try {
    result = attr(propsProxy, ast);
  } catch {
    return null;
  }
  if (bailed || result === null || typeof result !== 'object' || Array.isArray(result)) return null;
  // Shallow-clone so the plan owns its `output` independent of the user's literal.
  return { output: { ...(result as Dict<unknown>) }, popped };
}

/**
 * Apply the arity-2 attrs in `attrs` order to `context`: a traced plan
 * merges its output and replays its pops; an untraced callback runs with a
 * live `ast` over the host's `lookup`.
 */
export function applyPostAttrs<Context extends object>(
  context: Context,
  attrs: ReadonlyArray<unknown>,
  plans: ReadonlyArray<PostAttrsPlan | null>,
  host: PostAttrsHost<Context>
): void {
  let ast: CompiledAst | null = null;
  let planIdx = 0;
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i];
    if (!isPostAttr(attr)) continue;
    const plan = plans[planIdx++];

    if (plan !== null) {
      host.merge(context, plan.output);
      if (plan.popped !== null) plan.popped.forEach(host.onPop);
      continue;
    }

    if (ast === null) ast = createAstAccessor(host.lookup, host.onPop);
    host.merge(context, attr({ ...context }, ast) as Dict<unknown>);
  }
}
