import { getAnchorRect } from '../../anchorRegistry';
import { warnOnce } from '../dev';
import { tokenize, tokenizeFunctionArgs } from '../tokenize';
import { Token, TokenKind } from '../tokens';
import type { ResolveEnv, Resolver } from './resolvers';

/**
 * Render-time resolvers for `anchor()` and `anchor-size()` (CSS Anchor
 * Positioning L1, core subset). Rects come from the module anchor
 * registry, published by elements declaring `anchor-name`; the rects
 * are parent-relative onLayout values, so the positioned element must
 * share its anchor's parent (RN absolute positioning space). The
 * subset and deviations are locked in
 * src/native/test/anchor-positioning.test.tsx.
 */

const PHYSICAL_SIDES = new Set(['top', 'right', 'bottom', 'left']);
const SIZE_KEYWORDS = new Set(['width', 'height']);

function isVerticalInset(prop: string): boolean {
  return prop === 'top' || prop === 'bottom';
}

function fallbackValue(raw: string | null): number | string | null {
  if (raw === null || raw === '') return null;
  const toks = tokenize(raw);
  if (toks.length === 1) {
    const t = toks[0];
    if (t.kind === TokenKind.Length && (t.unit === 'px' || t.unit === '')) return t.value!;
    if (t.kind === TokenKind.Number) return t.value!;
    if (t.kind === TokenKind.Percent) return t.value! + '%';
  }
  return raw;
}

/** Split `attr`-style head/fallback at the first top-level comma. */
function splitArgs(argsRaw: string): { head: Token[]; fallbackRaw: string | null } {
  let depth = 0;
  for (let i = 0; i < argsRaw.length; i++) {
    const c = argsRaw.charCodeAt(i);
    if (c === 0x28) depth++;
    else if (c === 0x29) depth--;
    else if (c === 0x2c && depth === 0) {
      return { head: tokenize(argsRaw.slice(0, i)), fallbackRaw: argsRaw.slice(i + 1).trim() };
    }
  }
  return { head: tokenize(argsRaw), fallbackRaw: null };
}

/**
 * Build the resolver for `anchor( <anchor-name>? && <anchor-side>,
 * <length-percentage>? )` used in inset property `prop`. Physical side
 * keywords only; axis-mismatched sides and unsupported keywords resolve
 * to the fallback (or invalidate without one).
 */
export function buildAnchorResolver(value: string, prop: string, isSize: boolean): Resolver | null {
  const toks = tokenize(value);
  if (toks.length !== 1 || toks[0].kind !== TokenKind.Function) return null;
  const fn = toks[0];
  const { head, fallbackRaw } = splitArgs(fn.args || '');
  const fallback = fallbackValue(fallbackRaw);

  let name: string | null = null;
  let keyword: string | null = null;
  for (let i = 0; i < head.length; i++) {
    const t = head[i];
    if (t.kind !== TokenKind.Ident) return null;
    if (t.raw.startsWith('--')) {
      if (name !== null) return null;
      name = t.raw;
    } else if ((isSize ? SIZE_KEYWORDS : PHYSICAL_SIDES).has(t.name!)) {
      if (keyword !== null) return null;
      keyword = t.name!;
    } else {
      // start/end/self-*/center/<percentage>/inside/outside (and the
      // omitted anchor-size keyword) are outside the supported subset;
      // fall back rather than invalidate so authors keep their declared
      // safety value.
      if (__DEV__) {
        warnOnce(
          isSize ? 'native-anchor-size-keyword-unsupported' : 'native-anchor-side-unsupported',
          `\`${t.raw}\` in \`${isSize ? 'anchor-size()' : 'anchor()'}\` is not supported on React Native yet. Supported: ${isSize ? 'width, height' : 'the physical sides top, right, bottom, left'}, with an optional --name and fallback. The fallback value is used instead.`,
          t.raw
        );
      }
      return () => fallback;
    }
  }
  if (keyword === null) return () => fallback;

  if (!isSize) {
    // RN's bottom/right insets measure from the parent's far edges,
    // which needs the parent size the resolver doesn't have.
    if (prop === 'bottom' || prop === 'right') {
      if (__DEV__) {
        warnOnce(
          'native-anchor-inset-edge-unsupported',
          `\`anchor()\` in the \`${prop}\` inset is not supported on React Native yet because far-edge insets need the parent's measured size. Anchor the element with \`top\` / \`left\` instead (e.g. top: anchor(bottom)).`,
          prop
        );
      }
      return () => fallback;
    }
    // "These are only usable in the inset properties in the matching axis."
    const keywordVertical = keyword === 'top' || keyword === 'bottom';
    if (keywordVertical !== isVerticalInset(prop)) {
      return () => fallback;
    }
  }

  const side = keyword;
  return (env: ResolveEnv) => {
    const anchorName = name ?? env.positionAnchor ?? null;
    if (anchorName === null) return fallback;
    const rect = getAnchorRect(anchorName);
    if (rect === undefined) return fallback;
    if (isSize) return side === 'width' ? rect.width : rect.height;
    if (side === 'top') return rect.y;
    if (side === 'bottom') return rect.y + rect.height;
    if (side === 'left') return rect.x;
    return rect.x + rect.width;
  };
}

/** Quick syntactic gate used by the styled-component construction scan. */
export const ANCHOR_FN_RE = /\banchor(?:-size)?\(/;
