import { createElement, type ReactNode } from 'react';
import type { Dict } from '../types';
import {
  type ContainerContextValue,
  type NativeCascadeValues,
  NativeStyleContext,
  type NativeStyleContextValue,
} from './NativeStyleContext';

/** The leaf name React Native's `Pressable` goes by, the one host that hands interaction state to a `style` function. */
export const PRESSABLE_TARGET = 'Pressable';

/** The interaction state React Native's `Pressable` hands to a `style` or `children` function. */
export type InteractionState = {
  disabled?: boolean;
  focused?: boolean;
  hovered?: boolean;
  pressed?: boolean;
};

/** A function React Native calls with a `Pressable`'s interaction state: its `style` (returns a style) or its `children` (returns a node). */
export function isStateFunction<Result = unknown>(
  test: unknown
): test is (state: InteractionState) => Result {
  return typeof test === 'function';
}

/** The state a `Pressable` is in before any press: what a custom component's function style publishes. */
export const REST_STATE: Readonly<InteractionState> = Object.freeze({ pressed: false });

/**
 * Per-instance scratch and identity caches for the cascade a component
 * publishes. Allocated on first use, so a component that never publishes
 * allocates nothing.
 */
export interface CascadeSlot {
  /** The object last built for `cascadeBase`; reused while its three values still equal the walk's. */
  cascade: NativeCascadeValues | null;
  cascadeBase: NativeCascadeValues | null;
  /** The walk's result for each key, valid after {@link resolveCascadeKeys}. */
  direction: NativeCascadeValues['direction'];
  fontSize: number;
  lineHeight: number;
  /** Keys the walk has settled, as a bit mask. */
  seen: number;
  /** The context value last built over `valueContainer` and `valueCascade`. */
  value: NativeStyleContextValue | null;
  valueCascade: NativeCascadeValues | null;
  valueContainer: ContainerContextValue | null;
}

/** Anything that carries a {@link CascadeSlot}: the render-state cache of a component body. */
export interface CascadeHolder {
  cascadeSlot: CascadeSlot | null;
}

const FONT_SIZE = 1;
const LINE_HEIGHT = 2;
const DIRECTION = 4;
const ALL_KEYS = FONT_SIZE | LINE_HEIGHT | DIRECTION;

function createCascadeSlot(): CascadeSlot {
  return {
    cascade: null,
    cascadeBase: null,
    direction: 'ltr',
    fontSize: 0,
    lineHeight: 0,
    seen: 0,
    value: null,
    valueCascade: null,
    valueContainer: null,
  };
}

/**
 * Settle each key from the last layer that sets it, walking right to left so a
 * later array entry wins (React Native's merge order). A number sets a size, and
 * a present `undefined` unsets it to `base`'s value, as `flattenStyle` leaves the
 * host with no value of its own. Anything else (an animated value, a string) is
 * not a layer's answer, so a layer underneath can still win. Returns true when
 * every key is settled.
 */
function walkLayers(style: unknown, slot: CascadeSlot, base: NativeCascadeValues): boolean {
  if (style === null || typeof style !== 'object') return false;

  if (Array.isArray(style)) {
    for (let i = style.length - 1; i >= 0; i--) {
      if (walkLayers(style[i], slot, base)) return true;
    }
    return false;
  }

  if ((slot.seen & FONT_SIZE) === 0 && 'fontSize' in style) {
    const value = style.fontSize;
    if (typeof value === 'number') {
      slot.fontSize = value;
      slot.seen |= FONT_SIZE;
    } else if (value === undefined) {
      slot.fontSize = base.fontSize;
      slot.seen |= FONT_SIZE;
    }
  }

  if ((slot.seen & LINE_HEIGHT) === 0 && 'lineHeight' in style) {
    const value = style.lineHeight;
    if (typeof value === 'number') {
      slot.lineHeight = value;
      slot.seen |= LINE_HEIGHT;
    } else if (value === undefined) {
      slot.lineHeight = base.lineHeight;
      slot.seen |= LINE_HEIGHT;
    }
  }

  if ((slot.seen & DIRECTION) === 0 && 'direction' in style) {
    const value = style.direction;
    if (value === 'ltr' || value === 'rtl') {
      slot.direction = value;
      slot.seen |= DIRECTION;
    } else if (value === undefined || value === 'inherit') {
      slot.direction = base.direction;
      slot.seen |= DIRECTION;
    }
  }

  return slot.seen === ALL_KEYS;
}

/**
 * Walk `style` and leave the winning font size, line height and direction on
 * `slot`; a key no layer sets takes `base`'s value. The publish gate lives at
 * the call site (`cascadeWalkStyle`), which keeps this three-argument call monomorphic.
 */
function resolveCascadeKeys(slot: CascadeSlot, base: NativeCascadeValues, style: unknown): void {
  slot.seen = 0;
  slot.fontSize = base.fontSize;
  slot.lineHeight = base.lineHeight;
  slot.direction = base.direction;
  walkLayers(style, slot, base);
}

/**
 * The cascade to publish for the values {@link resolveCascadeKeys} left on `slot`:
 * `base` itself when all three equal its own, else an object identity-stable
 * for equal values (a caller passing a fresh `{ fontSize: 20 }` each render
 * keeps the same one). Custom properties and the grid entry carry over from `base`.
 */
function cascadeWith(slot: CascadeSlot, base: NativeCascadeValues): NativeCascadeValues {
  const { direction, fontSize, lineHeight } = slot;
  if (
    fontSize === base.fontSize &&
    lineHeight === base.lineHeight &&
    direction === base.direction
  ) {
    return base;
  }

  const cached = slot.cascade;
  if (
    cached !== null &&
    slot.cascadeBase === base &&
    cached.fontSize === fontSize &&
    cached.lineHeight === lineHeight &&
    cached.direction === direction
  ) {
    return cached;
  }

  const next: NativeCascadeValues = {
    fontSize,
    lineHeight,
    rootFontSize: base.rootFontSize,
    direction,
  };
  if (base.customProperties !== undefined) next.customProperties = base.customProperties;
  // Grid items size against the nearest grid container's entry; keep it through a rebuild.
  if (base.grid !== undefined) next.grid = base.grid;

  slot.cascade = next;
  slot.cascadeBase = base;
  return next;
}

/** The cascade a component publishes over `inherited` once `style`'s layers are read; `inherited` itself when none sets a key. */
export function publishCascade(
  holder: CascadeHolder,
  inherited: NativeCascadeValues,
  style: unknown
): NativeCascadeValues {
  const slot = holder.cascadeSlot ?? (holder.cascadeSlot = createCascadeSlot());
  resolveCascadeKeys(slot, inherited, style);
  return cascadeWith(slot, inherited);
}

/**
 * The context value that carries `cascade` over `ctx`'s container entry. The
 * parent's own `ctx` when `cascade` is the parent's, so React's identity check
 * stops propagation and a component that adds nothing costs its consumers nothing.
 */
export function contextValueFor(
  holder: CascadeHolder,
  ctx: NativeStyleContextValue,
  cascade: NativeCascadeValues
): NativeStyleContextValue {
  if (cascade === ctx.cascade) return ctx;

  const slot = holder.cascadeSlot ?? (holder.cascadeSlot = createCascadeSlot());
  const cached = slot.value;
  if (cached !== null && slot.valueContainer === ctx.container && slot.valueCascade === cascade) {
    return cached;
  }

  const value: NativeStyleContextValue = { container: ctx.container, cascade };
  slot.value = value;
  slot.valueCascade = cascade;
  slot.valueContainer = ctx.container;
  return value;
}

/** The value a `Pressable`'s descendants read at `state`: what `here` carries, with the font size, line height and direction `stateStyle` sets at that state. */
function stateValue(
  holder: CascadeHolder,
  here: NativeStyleContextValue,
  stateStyle: StateStyle | null,
  state: InteractionState
): NativeStyleContextValue {
  if (stateStyle === null) return here;
  return contextValueFor(holder, here, publishCascade(holder, here.cascade, stateStyle(state)));
}

/** A `Pressable`'s function `style`. */
export type StateStyle = (state: InteractionState) => unknown;

/**
 * Put a `NativeStyleContext` provider between a `Pressable` and its children, so
 * the descendants read what its `style` function publishes at the current press
 * state. `stateStyle` is that function, or null when the style cannot change with
 * state. `owner` holds the wrap's own cascade holder (allocated on first use), so
 * the values it builds at rest and pressed never replace the body's cached ones.
 *
 * The children become a function only when React Native already tracks presses
 * (the style or the children are one already), so a style that cannot change
 * with state costs no press tracking. Either way the slot holds the same element
 * type, so a caller's style flipping between an object and a function keeps
 * every descendant mounted. The provider builds on the value above it, so a
 * container or grid entry published there survives. With no children there is
 * nothing to keep mounted, so `props` return unchanged.
 */
export function withStateCascade(
  props: Dict<unknown>,
  owner: { stateHolder: CascadeHolder | null },
  stateStyle: StateStyle | null
): Dict<unknown> {
  const original = props.children;
  if (original == null) return props;

  const renderOriginal = isStateFunction<ReactNode>(original) ? original : null;

  if (renderOriginal === null && stateStyle === null) {
    return {
      ...props,
      children: createElement(NativeStyleContext.Consumer, {
        children: here =>
          createElement(NativeStyleContext.Provider, {
            children: original as ReactNode,
            value: here,
          }),
      }),
    };
  }

  const holder = owner.stateHolder ?? (owner.stateHolder = { cascadeSlot: null });
  const children = (state: InteractionState) =>
    createElement(NativeStyleContext.Consumer, {
      children: here =>
        createElement(NativeStyleContext.Provider, {
          children: renderOriginal === null ? (original as ReactNode) : renderOriginal(state),
          value: stateValue(holder, here, stateStyle, state),
        }),
    });
  return { ...props, children };
}
