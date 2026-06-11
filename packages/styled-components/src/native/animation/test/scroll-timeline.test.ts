import { resetNativeStyleCache, toNativeStyles } from '../../../models/compileNative';
import { resetWarningsForTest } from '../../transform/dev';

const stubStyleSheet = {
  create: <T extends object>(styles: T) => styles,
} as any;

beforeEach(() => {
  resetNativeStyleCache();
  resetWarningsForTest();
});

function timelineOf(css: string) {
  const r = toNativeStyles(`animation-name: pulse; ${css}`, stubStyleSheet);
  return r.animations![0].timeline;
}

// ──────────────────────────────────────────────────────────────────────
// animation-timeline parsing.
//
// CSS Animations Level 2 §4.9 (drafts.csswg.org/css-animations-2/,
// fetched 2026-06-09):
//   animation-timeline: <single-animation-timeline>#
//   <single-animation-timeline> = auto | none | <dashed-ident> | <scroll()> | <view()>
//   Initial: auto
// - auto: "The animation's timeline is a DocumentTimeline, more
//   specifically the default document timeline."
// - none: "The animation is not associated with a timeline."
// - <dashed-ident>: "If a named scroll progress timeline or view progress
//   timeline is in scope on this element, use the referenced timeline ...
//   Otherwise the animation is not associated with a timeline."
//
// CSS Scroll-driven Animations L1 §2.2.1 (drafts.csswg.org/scroll-animations-1/):
//   <scroll()> = scroll( [ <scroller> || <axis> ]? )
//   <axis> = block | inline | x | y
//   <scroller> = root | nearest | self
// - "By default, scroll() references the block axis of the nearest
//   ancestor scroll container."
//
// Deviation note: css-animations-2 §4.10 includes
// <single-animation-timeline> in the <single-animation> shorthand
// grammar. The function forms (scroll() / view()) are unambiguous and
// supported there; a bare <dashed-ident> in the shorthand is taken as
// the keyframes name (the established, more common reading), so named
// timelines must be set via the animation-timeline longhand.
// ──────────────────────────────────────────────────────────────────────
describe('animation-timeline spec compliance (CSS Animations 2 §4.9 + Scroll-driven Animations §2.2.1)', () => {
  it('initial value is auto (document timeline)', () => {
    expect(timelineOf('')).toEqual({ kind: 'auto' });
  });

  it('none dissociates the animation from any timeline', () => {
    expect(timelineOf('animation-timeline: none;')).toEqual({ kind: 'none' });
  });

  it('a dashed-ident references a named timeline', () => {
    expect(timelineOf('animation-timeline: --my-scroller;')).toEqual({
      kind: 'named',
      name: '--my-scroller',
    });
  });

  it('scroll() defaults to the nearest scroller and block axis', () => {
    expect(timelineOf('animation-timeline: scroll();')).toEqual({
      kind: 'scroll',
      scroller: 'nearest',
      axis: 'block',
    });
  });

  it('scroll() accepts scroller and axis in either order (|| grammar)', () => {
    expect(timelineOf('animation-timeline: scroll(self y);')).toEqual({
      kind: 'scroll',
      scroller: 'self',
      axis: 'y',
    });
    expect(timelineOf('animation-timeline: scroll(y self);')).toEqual({
      kind: 'scroll',
      scroller: 'self',
      axis: 'y',
    });
    expect(timelineOf('animation-timeline: scroll(root);')).toEqual({
      kind: 'scroll',
      scroller: 'root',
      axis: 'block',
    });
    expect(timelineOf('animation-timeline: scroll(inline);')).toEqual({
      kind: 'scroll',
      scroller: 'nearest',
      axis: 'inline',
    });
  });

  it('a duplicate component or unknown ident invalidates the declaration', () => {
    expect(timelineOf('animation-timeline: scroll(bogus);')).toEqual({ kind: 'auto' });
    expect(timelineOf('animation-timeline: scroll(x y);')).toEqual({ kind: 'auto' });
    expect(timelineOf('animation-timeline: scroll(self nearest);')).toEqual({ kind: 'auto' });
  });

  it('view() parses with default axis', () => {
    expect(timelineOf('animation-timeline: view();')).toEqual({
      kind: 'view',
      axis: 'block',
      inset: null,
    });
  });

  it('comma lists pair timelines with animation names', () => {
    const r = toNativeStyles(
      'animation-name: reveal, hide; animation-timeline: scroll(), --tl;',
      stubStyleSheet
    );
    expect(r.animations![0].timeline).toEqual({
      kind: 'scroll',
      scroller: 'nearest',
      axis: 'block',
    });
    expect(r.animations![1].timeline).toEqual({ kind: 'named', name: '--tl' });
  });

  it('the animation shorthand accepts the scroll() function form', () => {
    const r = toNativeStyles('animation: pulse linear both scroll(inline);', stubStyleSheet);
    expect(r.animations![0].timeline).toEqual({
      kind: 'scroll',
      scroller: 'nearest',
      axis: 'inline',
    });
    expect(r.animations![0].name).toBe('pulse');
  });

  it('a later animation shorthand without a timeline resets it to auto', () => {
    expect(timelineOf('animation-timeline: scroll(); animation: pulse 1s;')).toEqual({
      kind: 'auto',
    });
  });
});

// ──────────────────────────────────────────────────────────────────────
// Named scroll timeline declaration on the scroller.
//
// CSS Scroll-driven Animations L1 §2.3.1 / §2.3.2 / §2.3.3:
//   scroll-timeline-name: [ none | <dashed-ident> ]#   (initial: none)
//   scroll-timeline-axis: [ block | inline | x | y ]#  (initial: block)
//   scroll-timeline: [ <'scroll-timeline-name'> <'scroll-timeline-axis'>? ]#
// - "Specifies names for the named scroll progress timelines associated
//   with this element."
// - axis: "Specifies the axis of any named scroll progress timelines
//   sourced from this scroll container. If this box is not a scroll
//   container, then the corresponding named scroll progress timeline is
//   inactive."
// ──────────────────────────────────────────────────────────────────────
describe('scroll-timeline declaration spec compliance (Scroll-driven Animations §2.3)', () => {
  it('scroll-timeline-name declares a named timeline with default block axis', () => {
    const r = toNativeStyles('scroll-timeline-name: --hero;', stubStyleSheet);
    expect(r.scrollTimeline).toEqual({ name: '--hero', axis: 'block' });
  });

  it('scroll-timeline-axis sets the measured axis', () => {
    const r = toNativeStyles(
      'scroll-timeline-name: --hero; scroll-timeline-axis: inline;',
      stubStyleSheet
    );
    expect(r.scrollTimeline).toEqual({ name: '--hero', axis: 'inline' });
  });

  it('the scroll-timeline shorthand sets name and axis together', () => {
    const r = toNativeStyles('scroll-timeline: --hero x;', stubStyleSheet);
    expect(r.scrollTimeline).toEqual({ name: '--hero', axis: 'x' });
  });

  it('scroll-timeline-name: none declares no timeline', () => {
    const r = toNativeStyles('scroll-timeline-name: none;', stubStyleSheet);
    expect(r.scrollTimeline).toBeUndefined();
  });

  it('a non-dashed ident is invalid', () => {
    const r = toNativeStyles('scroll-timeline-name: hero;', stubStyleSheet);
    expect(r.scrollTimeline).toBeUndefined();
  });
});
