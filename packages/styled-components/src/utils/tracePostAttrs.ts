/**
 * Construction-time trace for arity-2 (`(props, ast) => ...`) attrs.
 *
 * The render-time fallback walks the source AST per `pop`/`peek` call ;
 * cheap, but still per-render work. For the common case where the
 * callback's behavior is fully determined by static base decls (no
 * interpolations, no `props` reads), we run it once at construction with
 * a recording `ast` whose `pop`/`peek` return the *real* resolved
 * declaration values. Whatever the callback returns is the static plan.
 *
 * Pre-resolving at trace time (rather than returning sentinel tokens)
 * means user operations like `ast.pop('color') ?? 'fallback'`,
 * `'#' + ast.peek('color')`, or `ast.pop('color').toUpperCase()` produce
 * the same result at trace time as they would at render time. The plan
 * is byte-equivalent to what the runtime path would compute.
 *
 * Bail (return null → runtime fallback) when:
 * - The callback throws.
 * - The callback reads any property of `props` (signaled via Proxy). The
 *   trace can't know which prop-conditional branches the callback would
 *   take at render time.
 * - A `pop`/`peek` call references a templated decl (resolution requires
 *   the per-render `filled[]` array; not available at construction).
 * - The return value is not a plain object (function, array, primitive).
 */
import { NodeKind, type Root } from '../parser/ast';
import { getSource } from '../parser/source';
import type { BaseObject, CompiledAst, Dict, RuleSet } from '../types';

export interface PostAttrsPlan {
  /** Pre-computed bag of element props to merge into context at render time. */
  output: Dict<unknown>;
  /** Decl keys that were popped;applied as inline overrides on web, dropped from base on native. */
  popped: ReadonlySet<string> | null;
}

/** Convert a kebab-case CSS prop to its camelCase form (no allocation when already camel). */
function camelizeProp(prop: string): string {
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
 * Returns the literal value of a top-level decl matching `prop`.
 * - `string`: the static value
 * - `undefined`: decl absent
 * - `null`: decl exists but its value is templated, OR the source prop name
 *           differs from the user's argument (kebab vs camel rename) which
 *           signals a polyfilled prop whose runtime value may be transformed.
 *           Either case forces the runtime fallback.
 */
function findStaticBaseDecl(ast: Root, prop: string): string | undefined | null {
  const camelTarget = camelizeProp(prop);
  for (let i = 0; i < ast.length; i++) {
    const node = ast[i];
    if (node.kind !== NodeKind.Decl) continue;
    if (typeof node.prop !== 'string') continue;
    const exact = node.prop === prop;
    const camelMatch = !exact && camelizeProp(node.prop) === camelTarget;
    if (!exact && !camelMatch) continue;
    const v = node.value;
    if (typeof v !== 'string') return null;
    // Kebab-vs-camel mismatch: the runtime value may have been
    // transformed by a polyfill (e.g. `accent-color: auto` resolves to a
    // PlatformColor). Bail so the render path uses the resolved value.
    if (camelMatch) return null;
    return v;
  }
  return undefined;
}

export function tracePostAttr<Props extends BaseObject>(
  attr: (p: any, ast: CompiledAst) => any,
  rules: RuleSet<Props>
): PostAttrsPlan | null {
  const source = getSource(rules);
  if (!source) return null;
  const ast = source.ast;

  let propsRead = false;
  // Empty target so unknown reads return undefined cleanly. Only the `get`
  // trap is needed: `has` and `ownKeys` short-circuit on empty target
  // without consulting them; if the user enumerates with `for..in` they'd
  // hit `ownKeys` but that pattern is exotic in attrs callbacks.
  const propsProxy = new Proxy(
    {},
    {
      get(_, prop) {
        if (typeof prop === 'symbol') return undefined;
        propsRead = true;
        return undefined;
      },
    }
  );

  let bailed = false;
  let popped: Set<string> | null = null;

  // Implementation accepts optional `fallback`; TS overloads on `CompiledAst`
  // narrow to `string` when fallback is supplied. Theme paths (any string
  // containing `.`) are unresolvable at construction (theme is a render-
  // time input);bail to runtime fallback.
  // The popped set stores the camelized key so the render path can delete
  // the matching entry from `effectiveBase` (whose keys are camelized).
  const recordingAst = {
    pop(keyOrPath: string, fallback?: string): string | undefined {
      if (keyOrPath.indexOf('.') !== -1) {
        bailed = true;
        return undefined;
      }
      const v = findStaticBaseDecl(ast, keyOrPath);
      if (v === null) {
        bailed = true;
        return fallback;
      }
      if (v !== undefined) {
        if (popped === null) popped = new Set();
        popped.add(camelizeProp(keyOrPath));
      }
      return v !== undefined ? v : fallback;
    },
    peek(keyOrPath: string, fallback?: string): string | undefined {
      if (keyOrPath.indexOf('.') !== -1) {
        bailed = true;
        return undefined;
      }
      const v = findStaticBaseDecl(ast, keyOrPath);
      if (v === null) {
        bailed = true;
        return fallback;
      }
      return v !== undefined ? v : fallback;
    },
  } as CompiledAst;

  let result: unknown;
  try {
    result = attr(propsProxy, recordingAst);
  } catch {
    return null;
  }

  if (bailed || propsRead) return null;
  if (result === null || result === undefined || typeof result !== 'object') return null;
  if (Array.isArray(result)) return null;

  // Shallow-clone so the plan owns its `output` independent of any
  // accidental sharing with the user's literal.
  const output: Dict<unknown> = { ...(result as Dict<unknown>) };
  return { output, popped };
}
