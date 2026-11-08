import { Dict } from '../../../types';
import { warnOnce } from '../dev';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

const OVERSCROLL_KEYWORDS = new Set(['contain', 'none', 'auto', 'chain']);
const SCROLLBAR_WIDTH_KEYWORDS = new Set(['auto', 'thin', 'none']);
const SNAP_AXIS_KEYWORDS = new Set(['x', 'y', 'block', 'inline', 'both']);
const SNAP_STRICTNESS_KEYWORDS = new Set(['mandatory', 'proximity']);
const SNAP_ALIGN_KEYWORDS = new Set(['none', 'start', 'end', 'center']);

function overscrollBehaviorShorthand(tokens: Token[]): Dict<unknown> | null {
  const stream = new TokenStream(tokens);
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Ident || !stream.eof()) return null;
  const name = t.name;
  if (!OVERSCROLL_KEYWORDS.has(name)) return null;
  const suppress = name === 'contain' || name === 'none';
  return {
    bounces: !suppress,
    overScrollMode: suppress ? 'never' : 'auto',
  };
}

function scrollbarWidthHandler(tokens: Token[]): Dict<unknown> | null {
  const stream = new TokenStream(tokens);
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Ident || !stream.eof()) return null;
  const name = t.name;
  if (!SCROLLBAR_WIDTH_KEYWORDS.has(name)) return null;
  const hide = name === 'none';
  return {
    showsVerticalScrollIndicator: !hide,
    showsHorizontalScrollIndicator: !hide,
  };
}

/**
 * `scroll-snap-type` shorthand:
 *   none | [ x | y | block | inline | both ] [ mandatory | proximity ]?
 * Strictness defaults to `proximity` when omitted.
 *
 * RN has no native scroll-snap engine. Snap points are configured on the
 * scroller (`snapToInterval` / `snapToOffsets`), so the lift approximates
 * the spec on the styled ScrollView:
 *   - `none`       -> no props (free scroll, the ScrollView default)
 *   - `* mandatory` -> snapToAlignment + fast deceleration + full-scrollport
 *                      paging, warning that paging is the approximation and
 *                      that supplying snapToInterval / snapToOffsets gives
 *                      precise snap points (those props override pagingEnabled
 *                      and, as user props, win over the lift)
 *   - `* proximity` -> snapToAlignment + fast deceleration only, warning that
 *                      RN has no proximity engine
 * The axis keyword is accepted but does not change the lift: a ScrollView
 * snaps along whichever axis it scrolls.
 */
function scrollSnapTypeShorthand(tokens: Token[]): Dict<unknown> | null {
  const stream = new TokenStream(tokens);
  const first = stream.consume();
  if (!first || first.kind !== TokenKind.Ident) return null;

  if (first.name === 'none') return stream.eof() ? {} : null;

  if (!SNAP_AXIS_KEYWORDS.has(first.name)) return null;
  const axis = first.name;

  let strictness = 'proximity';
  if (!stream.eof()) {
    const second = stream.consume();
    if (!second || second.kind !== TokenKind.Ident) return null;
    if (!SNAP_STRICTNESS_KEYWORDS.has(second.name)) return null;
    strictness = second.name;
    if (!stream.eof()) return null;
  }

  const out: Dict<unknown> = { decelerationRate: 'fast' };

  if (strictness === 'mandatory') {
    // pagingEnabled WITHOUT snapToAlignment routes Android onto the
    // animator-driven page-snap path. Adding snapToAlignment switches the
    // engine to its OverScroller item path, which strands mid-card on
    // short flicks (device-verified on RN 0.85).
    out.pagingEnabled = true;
    if (__DEV__) {
      warnOnce(
        'native-scroll-snap-paging',
        '`scroll-snap-type: ' +
          axis +
          ' mandatory` defaults to full-scrollport paging on React Native. Declare `scroll-snap-align` on the children that should snap, or pass `snapToInterval` / `snapToOffsets` on the styled ScrollView (your props win).',
        axis + ' mandatory'
      );
    }
  } else {
    out.snapToAlignment = 'start';
    if (__DEV__) {
      warnOnce(
        'native-scroll-snap-proximity',
        '`scroll-snap-type: ' +
          axis +
          ' proximity` is best-effort on React Native, which has no proximity snapping engine; it applies fast deceleration only. For deterministic snapping use `mandatory`, or pass `snapToInterval` / `snapToOffsets` on the styled ScrollView.',
        axis + ' proximity'
      );
    }
  }

  return out;
}

/**
 * `scroll-snap-align` (on children): [ none | start | end | center ]{1,2}.
 * RN configures snapping on the scroller, not per child, so the native
 * build emits a sentinel the compiler extracts; at render the child
 * registers its measured layout with the nearest styled scroll container,
 * which derives `snapToOffsets` from the aligned children.
 */
function scrollSnapAlignHandler(tokens: Token[]): Dict<unknown> | null {
  const stream = new TokenStream(tokens);
  const first = stream.consume();
  if (!first || first.kind !== TokenKind.Ident) return null;
  if (!SNAP_ALIGN_KEYWORDS.has(first.name)) return null;

  let raw = first.name;
  if (!stream.eof()) {
    const second = stream.consume();
    if (!second || second.kind !== TokenKind.Ident) return null;
    if (!SNAP_ALIGN_KEYWORDS.has(second.name)) return null;
    if (!stream.eof()) return null;
    raw = `${first.name} ${second.name}`;
  }

  if (raw === 'none' || raw === 'none none') return {};
  return { __scSnapAlign: raw };
}

/**
 * `scroll-snap-stop: normal | always` (on children). `always` rides the
 * same registration as scroll-snap-align: the scroll container sets
 * `disableIntervalMomentum` so a fling cannot skip past the target.
 * `normal` is the initial value (no props).
 */
function scrollSnapStopHandler(tokens: Token[]): Dict<unknown> | null {
  const stream = new TokenStream(tokens);
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Ident || !stream.eof()) return null;
  const name = t.name;
  if (name !== 'normal' && name !== 'always') return null;
  return name === 'always' ? { __scSnapStop: true } : {};
}

register('overscrollBehavior', overscrollBehaviorShorthand);
register('scrollbarWidth', scrollbarWidthHandler);
register('scrollSnapType', scrollSnapTypeShorthand);
register('scrollSnapAlign', scrollSnapAlignHandler);
register('scrollSnapStop', scrollSnapStopHandler);
