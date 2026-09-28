import {
  NodeKind,
  StaticDeclNode,
  StaticKeyframeFrame,
  StaticNode,
  StaticRoot,
} from '../parser/ast';
import { emitWeb } from '../parser/emit-web';
import { parse } from '../parser/parser';
import { compileWebFilled } from '../parser/compile';
import type { Compiler } from '../types';
import { EMPTY_ARRAY, EMPTY_OBJECT } from './empties';
import throwStyledError from './error';
import { SEED, phash } from './hash';

/**
 * `body` as the block of the rule or at-rule `outer` holds; a stray `}` in the
 * body was already dropped by reading it on its own.
 */
function wrapBody(outer: StaticRoot, body: StaticRoot): StaticRoot {
  const node = outer.length === 1 ? outer[0] : undefined;
  if (node === undefined) return outer;
  let wrapped: StaticNode;
  if (node.kind === NodeKind.Rule) {
    wrapped = { kind: NodeKind.Rule, selectors: node.selectors, children: body };
  } else if (node.kind === NodeKind.AtRule && node.children !== null) {
    wrapped = { kind: NodeKind.AtRule, name: node.name, prelude: node.prelude, children: body };
  } else if (node.kind === NodeKind.Keyframes) {
    const frames: StaticKeyframeFrame[] = [];
    for (let i = 0; i < body.length; i++) {
      const rule = body[i];
      if (rule.kind !== NodeKind.Rule) continue;
      const decls: StaticDeclNode[] = [];
      for (let j = 0; j < rule.children.length; j++) {
        const child = rule.children[j];
        if (child.kind === NodeKind.Decl) decls.push(child);
      }
      frames.push({ stops: rule.selectors, children: decls });
    }
    wrapped = { kind: NodeKind.Keyframes, name: node.name, prelude: node.prelude, frames };
  } else {
    return outer;
  }
  return [wrapped];
}

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
  plugins?: SCPlugin[] | undefined;
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
  // EMPTY_ARRAY is `Readonly<any[]>`; SCPlugin[] needs the mutable type.
  plugins = EMPTY_ARRAY as SCPlugin[],
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
    const body = parse(css);
    const wrapSelector = prefix || selector ? (prefix ? prefix + ' ' : '') + selector : '';
    const ast = wrapSelector ? wrapBody(parse(wrapSelector + '{}'), body) : body;
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
    const name = plugins[i]?.name;
    if (!name) throw throwStyledError(15);
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
