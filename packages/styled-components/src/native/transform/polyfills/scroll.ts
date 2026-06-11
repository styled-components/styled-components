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

function overscrollBehaviorShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Ident || !stream.eof()) return null;
  const name = t.name;
  if (name === undefined || !OVERSCROLL_KEYWORDS.has(name)) return null;
  if (__NATIVE_WEB__) {
    // Browser ships overscroll-behavior; `auto` is the initial value so
    // emitting nothing defers to the ScrollView defaults.
    return name === 'auto' ? {} : { overscrollBehavior: name };
  }
  const suppress = name === 'contain' || name === 'none';
  return {
    bounces: !suppress,
    overScrollMode: suppress ? 'never' : 'auto',
  };
}

function scrollbarWidthHandler(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Ident || !stream.eof()) return null;
  const name = t.name;
  if (name === undefined || !SCROLLBAR_WIDTH_KEYWORDS.has(name)) return null;
  if (__NATIVE_WEB__) {
    // Browser ships scrollbar-width; `auto` is the initial value so
    // emitting nothing defers to the ScrollView defaults.
    return name === 'auto' ? {} : { scrollbarWidth: name };
  }
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
function scrollSnapTypeShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const first = stream.consume();
  if (!first || first.kind !== TokenKind.Ident || first.name === undefined) return null;

  if (first.name === 'none') {
    if (!stream.eof()) return null;
    if (__NATIVE_WEB__) return { scrollSnapType: 'none' };
    return {};
  }

  if (!SNAP_AXIS_KEYWORDS.has(first.name)) return null;
  const axis = first.name;

  let strictness = 'proximity';
  let raw = axis;
  if (!stream.eof()) {
    const second = stream.consume();
    if (!second || second.kind !== TokenKind.Ident || second.name === undefined) return null;
    if (!SNAP_STRICTNESS_KEYWORDS.has(second.name)) return null;
    strictness = second.name;
    raw = `${axis} ${strictness}`;
    if (!stream.eof()) return null;
  }

  if (__NATIVE_WEB__) {
    // The browser implements CSS scroll snap; pass the authored shorthand
    // through and lift no ScrollView props.
    return { scrollSnapType: raw };
  }

  const out: Dict<any> = { decelerationRate: 'fast' };

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
          ' mandatory` defaults to full-scrollport paging on React Native. Declare `scroll-snap-align` on the children that should snap (the scroller measures them and snaps to their real positions), or pass `snapToInterval` / `snapToOffsets` on the styled ScrollView (your props win).',
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
 * which derives `snapToOffsets` from the aligned children. rn-web passes
 * the raw value through to the browser.
 */
function scrollSnapAlignHandler(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const first = stream.consume();
  if (!first || first.kind !== TokenKind.Ident || first.name === undefined) return null;
  if (!SNAP_ALIGN_KEYWORDS.has(first.name)) return null;

  let raw = first.name;
  if (!stream.eof()) {
    const second = stream.consume();
    if (!second || second.kind !== TokenKind.Ident || second.name === undefined) return null;
    if (!SNAP_ALIGN_KEYWORDS.has(second.name)) return null;
    if (!stream.eof()) return null;
    raw = `${first.name} ${second.name}`;
  }

  if (__NATIVE_WEB__) {
    return { scrollSnapAlign: raw };
  }

  if (raw === 'none' || raw === 'none none') return {};
  return { __scSnapAlign: raw };
}

/**
 * `scroll-snap-stop: normal | always` (on children). `always` rides the
 * same registration as scroll-snap-align: the scroll container sets
 * `disableIntervalMomentum` so a fling cannot skip past the target.
 * `normal` is the initial value (no props). rn-web passes through.
 */
function scrollSnapStopHandler(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Ident || !stream.eof()) return null;
  const name = t.name;
  if (name !== 'normal' && name !== 'always') return null;
  if (__NATIVE_WEB__) {
    return { scrollSnapStop: name };
  }
  return name === 'always' ? { __scSnapStop: true } : {};
}

register('overscrollBehavior', overscrollBehaviorShorthand);
register('scrollbarWidth', scrollbarWidthHandler);
register('scrollSnapType', scrollSnapTypeShorthand);
register('scrollSnapAlign', scrollSnapAlignHandler);
register('scrollSnapStop', scrollSnapStopHandler);
