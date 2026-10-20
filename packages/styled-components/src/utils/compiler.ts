import { emitWeb } from '../parser/emit-web';
import { parse } from '../parser/parser';
import { compileWebFilled } from '../parser/compile';
import type { Compiler } from '../types';
import { EMPTY_ARRAY, EMPTY_OBJECT } from './empties';
import throwStyledError from './error';
import { SEED, phash } from './hash';
import { normalize } from './normalize';
import { warnOnce } from './warnOnce';

export { normalize } from './normalize';

/** One rewritten declaration pair. */
export type DeclResult = { prop: string; value: string };

/**
 * Declaration transform: return `{prop, value}` to override, an array to
 * expand one authored declaration into several, or undefined to pass.
 * Keep monomorphic on the pass-through path (return undefined, never allocate).
 */
export type DeclTransform = (
  prop: string,
  value: string
) => DeclResult | DeclResult[] | undefined | void;

/** Selector rewrite: a string replaces the selector; an array emits one rule per entry. */
export type SelectorTransform = (selector: string) => string | string[];

/**
 * Plugin shape: opt-in markers with optional `rw` (selector rewrite,
 * post namespace + `&` resolution) and `decl` (declaration rewrite) hooks.
 * Shipping transforms inside the plugin object lets bundlers tree-shake
 * implementations out of builds that don't import them.
 */
export interface SCPlugin {
  /** Contributes to the compiler hash so plugin sets get distinct caches. Throws #15 if missing. */
  name: string;
  rw?: SelectorTransform | undefined;
  decl?: DeclTransform | undefined;
}

export type ICreateCompiler = {
  options?: { namespace?: string | undefined } | undefined;
  plugins?: ReadonlyArray<SCPlugin> | undefined;
};

function composeDecl(prev: DeclTransform, next: DeclTransform): DeclTransform {
  return (p: string, v: string) => {
    const first = prev(p, v);
    if (!first) return next(p, v);

    if (Array.isArray(first)) {
      const out: DeclResult[] = [];
      for (let i = 0; i < first.length; i++) {
        const item = first[i];
        const mapped = next(item.prop, item.value);
        if (!mapped) {
          out.push(item);
        } else if (Array.isArray(mapped)) {
          for (let j = 0; j < mapped.length; j++) out.push(mapped[j]);
        } else {
          out.push(mapped);
        }
      }
      return out.length === 1 ? out[0] : out;
    }

    return next(first.prop, first.value) || first;
  };
}

/**
 * Plugins already seen in this process, keyed by name. Allocated on first
 * use inside the dev branch so a production bundle does not build it.
 */
let seenPluginsByName: Map<string, SCPlugin> | undefined;

/**
 * Class names hash a plugin's `name` and nothing else about it, and the
 * server and the client both have to reproduce that hash. Two different
 * plugins with one name therefore share a class, and whichever subtree
 * renders first supplies the CSS for every subtree using the name. Object
 * identity is the right check for a warning and the wrong input for the
 * hash: a plugin object on the server is never the one on the client, and
 * function source is not stable across the two builds.
 */
function notePluginName(plugin: SCPlugin): void {
  if (__DEV__) {
    const name = plugin.name;
    let seen = seenPluginsByName;
    if (seen === undefined) {
      seen = new Map();
      seenPluginsByName = seen;
    }
    const prior = seen.get(name);
    if (prior === undefined) {
      seen.set(name, plugin);
    } else if (prior !== plugin) {
      warnOnce(
        'plugin-name-collision',
        `plugin name "${name}" is used by two different plugins. Every subtree using that name gets the same class, and the first one to render supplies the CSS for all of them. Give each plugin a distinct name.`,
        name
      );
    }
  }
}

/** Test-only. Clears the dev registry of plugins seen by name. */
export function resetSeenPlugins(): void {
  seenPluginsByName = undefined;
}

function composeRw(prev: SelectorTransform, next: SelectorTransform): SelectorTransform {
  return (s: string) => {
    const first = prev(s);
    if (Array.isArray(first)) {
      const out: string[] = [];
      for (let i = 0; i < first.length; i++) {
        const mapped = next(first[i]);
        if (Array.isArray(mapped)) {
          for (let j = 0; j < mapped.length; j++) out.push(mapped[j]);
        } else {
          out.push(mapped);
        }
      }
      return out.length === 1 ? out[0] : out;
    }
    return next(first);
  };
}

export default function createCompiler({
  options = EMPTY_OBJECT,
  plugins = EMPTY_ARRAY,
}: ICreateCompiler = EMPTY_OBJECT) {
  // Multiple plugins compose left-to-right.
  let postProcessSelector: SelectorTransform | undefined;
  let postProcessDecl: DeclTransform | undefined;
  for (let i = 0; i < plugins.length; i++) {
    const plugin = plugins[i];
    if (!plugin) continue;
    const rw = plugin.rw;
    if (rw) {
      postProcessSelector = postProcessSelector ? composeRw(postProcessSelector, rw) : rw;
    }
    const decl = plugin.decl;
    if (decl) {
      postProcessDecl = postProcessDecl ? composeDecl(postProcessDecl, decl) : decl;
    }
  }

  // Byte-identical to the v7 web emit path for hash + SSR rehydration stability.
  const compileString = (css: string, selector = '', prefix = '', componentId = '&'): string[] => {
    const flatCSS = normalize(css);
    const wrapSelector = prefix || selector ? (prefix ? prefix + ' ' : '') + selector : '';
    const wrappedCSS = wrapSelector ? wrapSelector + '{' + flatCSS + '}' : flatCSS;
    const ast = parse(wrappedCSS);
    if (ast.length === 0) return [];
    return emitWeb(ast, '', {
      selfRefSelector: selector,
      componentId,
      namespace: options.namespace,
      rw: postProcessSelector,
      decl: postProcessDecl,
    });
  };

  // Hash includes plugins + options so different configs produce
  // different class names and cache keys.
  let h = SEED;
  for (let i = 0; i < plugins.length; i++) {
    const plugin = plugins[i];
    const name = plugin?.name;
    if (!name) throw throwStyledError(15);
    if (__DEV__ && plugin) notePluginName(plugin);
    h = phash(h, name);
  }
  if (options.namespace) h = phash(h, options.namespace);

  const compiler: Compiler = {
    hash: h !== SEED ? h.toString() : '',
    compile: compileString,
    emit: (source, filled, parentSelector, componentId, fragments) =>
      compileWebFilled(
        source,
        filled,
        parentSelector,
        {
          selfRefSelector: parentSelector,
          componentId,
          namespace: options.namespace,
          rw: postProcessSelector,
          decl: postProcessDecl,
        },
        fragments
      ),
  };

  return compiler;
}
