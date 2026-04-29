import { emitWeb } from '../parser/emit-web';
import { parse } from '../parser/parser';
import { compileWebFilled } from '../parser/compile';
import type { Compiler } from '../types';
import { EMPTY_ARRAY, EMPTY_OBJECT } from './empties';
import throwStyledError from './error';
import { SEED, phash } from './hash';
import { preprocessCSS } from './preprocessCSS';

export { isEscaped, preprocessCSS } from './preprocessCSS';

/** Declaration transform: return `{prop, value}` to override or undefined to pass. Keep monomorphic. */
export type DeclTransform = (
  prop: string,
  value: string
) => { prop: string; value: string } | undefined | void;

/**
 * Plugin shape: opt-in markers with optional `rw` (selector rewrite,
 * post namespace + `&` resolution) and `decl` (declaration rewrite) hooks.
 * Shipping transforms inside the plugin object lets bundlers tree-shake
 * implementations out of builds that don't import them.
 */
export interface SCPlugin {
  /** Contributes to the compiler hash so plugin sets get distinct caches. Throws #15 if missing. */
  name: string;
  rw?: ((selector: string) => string) | undefined;
  decl?: DeclTransform | undefined;
}

export type ICreateCompiler = {
  options?: { namespace?: string | undefined } | undefined;
  plugins?: SCPlugin[] | undefined;
};

export default function createCompiler(
  {
    options = EMPTY_OBJECT as object,
    plugins = EMPTY_ARRAY as unknown as SCPlugin[],
  }: ICreateCompiler = EMPTY_OBJECT as object
) {
  // Multiple plugins compose left-to-right.
  let postProcessSelector: ((s: string) => string) | undefined;
  let postProcessDecl: DeclTransform | undefined;
  for (let i = 0; i < plugins.length; i++) {
    const plugin = plugins[i];
    if (!plugin) continue;
    const rw = plugin.rw;
    if (rw) {
      postProcessSelector = postProcessSelector
        ? (
            prev => (s: string) =>
              rw(prev!(s))
          )(postProcessSelector)
        : rw;
    }
    const decl = plugin.decl;
    if (decl) {
      postProcessDecl = postProcessDecl
        ? (prev => (p: string, v: string) => {
            const first = prev!(p, v);
            return decl(first ? first.prop : p, first ? first.value : v) || first;
          })(postProcessDecl)
        : decl;
    }
  }

  // Byte-identical to v6 stylis output for hash + SSR rehydration stability.
  const compileString = (css: string, selector = '', prefix = '', componentId = '&'): string[] => {
    const flatCSS = preprocessCSS(css);
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
  const o = options as ICreateCompiler['options'];
  let h = SEED;
  for (let i = 0; i < plugins.length; i++) {
    const name = plugins[i]?.name;
    if (!name) throw throwStyledError(15);
    h = phash(h, name);
  }
  if (o?.namespace) h = phash(h, o.namespace);

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
