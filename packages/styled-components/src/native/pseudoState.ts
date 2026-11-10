import type React from 'react';
import type { PseudoBearingConditionalStyle } from '../models/compileNative';
import type { PseudoState, PseudoTerm } from '../parser/ast';
import type { Dict } from '../types';
import { warnOnce } from '../utils/warnOnce';
import {
  attrMatches,
  combinatorMatches,
  conditionMatches,
  hasMatches,
  type MatchedLayers,
  nthChildMatches,
  pushMatched,
} from './conditionMatching';
import type { ContainerContextValue } from './NativeStyleContext';
import type { ParentContextValue } from './ParentContext';
import { PSEUDO_BIT, PSEUDO_TO_SELECTOR } from './pseudoBits';
import { type InteractionState, PRESSABLE_TARGET } from './publishCascade';
import { getRN, type MediaQueryEnv } from './responsive';
import type { ResolveEnv } from './transform/polyfills/resolvers';

const ENABLED_READ_ONLY = PSEUDO_BIT.enabled | PSEUDO_BIT.readOnly;
const DISABLEABLE = ENABLED_READ_ONLY | PSEUDO_BIT.disabled;

/**
 * Per RN host component whose `style` prop rejects the function (state callback) form, the
 * element-state pseudo-classes it can match (a mask of `PSEUDO_BIT`). Pressable is the one host that
 * invokes a function style with interaction state; every other host silently drops a function style,
 * taking the component's ENTIRE rule with it. Mirrors the alias list in native/index.ts; custom
 * component targets are intentionally absent so wrappers that forward style to a Pressable keep the
 * function form.
 */
const STATELESS_PSEUDOS = {
  ActivityIndicator: ENABLED_READ_ONLY,
  // Button renders its own View and Text, so the `style` it is given never reaches a host.
  Button: 0,
  FlatList: ENABLED_READ_ONLY,
  Image: ENABLED_READ_ONLY,
  ImageBackground: ENABLED_READ_ONLY,
  InputAccessoryView: ENABLED_READ_ONLY,
  KeyboardAvoidingView: ENABLED_READ_ONLY,
  Modal: ENABLED_READ_ONLY,
  RefreshControl: ENABLED_READ_ONLY,
  SafeAreaView: ENABLED_READ_ONLY,
  ScrollView: ENABLED_READ_ONLY,
  SectionList: ENABLED_READ_ONLY,
  StatusBar: ENABLED_READ_ONLY,
  Switch: DISABLEABLE,
  Text: DISABLEABLE,
  TextInput: DISABLEABLE | PSEUDO_BIT.readWrite,
  TouchableHighlight: DISABLEABLE,
  // These two clone their one child and apply no `style`, so no state rule on them reaches a host.
  TouchableNativeFeedback: 0,
  TouchableOpacity: DISABLEABLE,
  TouchableWithoutFeedback: 0,
  View: ENABLED_READ_ONLY,
  VirtualizedList: ENABLED_READ_ONLY,
} as const satisfies Record<string, number>;

/** `STATELESS_PSEUDOS` by host name; a name present here drops a function style. */
export const STATELESS_PSEUDO_MASKS: ReadonlyMap<string, number> = new Map(
  Object.entries(STATELESS_PSEUDOS)
);

/** `accessibilityState.disabled` of a props bag, or undefined. */
function accessibilityStateDisabled(props: Dict<unknown>): unknown {
  const accessibility = props.accessibilityState;
  return typeof accessibility === 'object' && accessibility !== null && 'disabled' in accessibility
    ? accessibility.disabled
    : undefined;
}

function textInputDisabled(props: Dict<unknown>): boolean {
  return props.disabled === true || props['aria-disabled'] === true;
}

/**
 * The element-state pseudo-classes the target matches from the props it receives
 * (`PSEUDO_BIT` bits). `forwarded` is the forwarded-props bag, so what matches is what the
 * element is given, and each built-in applies its own rule for "disabled".
 */
export function elementStates(host: string | undefined, forwarded: Dict<unknown>): number {
  switch (host) {
    case PRESSABLE_TARGET:
      return forwarded.disabled === true ? PSEUDO_BIT.disabled : 0;
    case 'Text':
    case 'TouchableOpacity':
      return (forwarded.disabled ??
        forwarded['aria-disabled'] ??
        accessibilityStateDisabled(forwarded)) === true
        ? PSEUDO_BIT.disabled
        : 0;
    case 'TouchableHighlight':
      return (forwarded.disabled ?? accessibilityStateDisabled(forwarded)) === true
        ? PSEUDO_BIT.disabled
        : 0;
    case 'Switch': {
      // RN reads the accessibility state on Android only.
      const disabled =
        getRN().Platform?.OS === 'android'
          ? (forwarded.disabled ?? accessibilityStateDisabled(forwarded))
          : forwarded.disabled;
      return disabled === true ? PSEUDO_BIT.disabled : 0;
    }
    case 'TextInput': {
      if (textInputDisabled(forwarded)) return PSEUDO_BIT.disabled;
      const readWrite =
        forwarded['aria-readonly'] !== true &&
        (forwarded.readOnly !== undefined ? !forwarded.readOnly : forwarded.editable !== false);
      return readWrite ? PSEUDO_BIT.readWrite : 0;
    }
  }
  if (host !== undefined && STATELESS_PSEUDO_MASKS.has(host)) return 0;
  // A custom component is read-write only when its props say so; `readOnly` beats `editable`, as on TextInput.
  if (forwarded.disabled === true) return PSEUDO_BIT.disabled;
  const readWrite =
    forwarded.readOnly !== undefined ? forwarded.readOnly === false : forwarded.editable === true;
  return readWrite ? PSEUDO_BIT.readWrite : 0;
}

/**
 * Translates the props that mean "disabled" or "read-only" into the ones React Native's TextInput reads,
 * in place on the forwarded-props bag. A no-op for every other target.
 */
export function normalizeDisabledProps(host: string | undefined, forwarded: Dict<unknown>): void {
  if (host !== 'TextInput') return;
  if (textInputDisabled(forwarded)) {
    // `readOnly` alone decides editability in React Native; `editable` stays for an `Animated` wrapper
    // whose inner input reads `editable` only.
    forwarded.readOnly = true;
    forwarded.editable = false;
    forwarded.focusable = false;
    forwarded['aria-disabled'] = true;
    // `tabIndex` overrides `focusable`.
    delete forwarded.tabIndex;
  } else if (forwarded['aria-readonly'] === true) {
    forwarded.readOnly = true;
  }
}

/** Why a stateless target never matches a pseudo-class, and what to use instead. */
function inertReason(pseudo: PseudoState, targetName: string, supported: number): string {
  if (supported === 0) {
    return (
      'it never applies the `style` it is given. ' +
      (targetName === 'Button'
        ? 'Use `styled.Pressable` around a `Text` instead.'
        : 'Style its child instead.')
    );
  }
  if (pseudo === 'disabled') {
    return (
      targetName +
      ' cannot be disabled. Use `styled.Pressable`, `styled.Switch`, `styled.Text`, `styled.TouchableOpacity`, `styled.TouchableHighlight`, `styled.TextInput`, or a custom component given `disabled`.'
    );
  }
  if (pseudo === 'readWrite') {
    return (
      targetName +
      ' cannot be edited. Use `styled.TextInput`, or a custom component given `readOnly={false}` or `editable={true}`.'
    );
  }
  return (
    targetName +
    ' has no press, hover or focus state. Use `styled.Pressable` for press / hover / focus styling, or fence a web-only rule behind `@media (hover: hover)`.'
  );
}

/** Warns once for a pseudo-class a stateless target cannot match. */
function warnInertPseudo(pseudo: PseudoState, targetName: string, supported: number): void {
  const selector = PSEUDO_TO_SELECTOR[pseudo];
  warnOnce(
    'native-pseudo-state-inert',
    '`' +
      selector +
      '` styles on a styled ' +
      targetName +
      ' never apply on React Native: ' +
      inertReason(pseudo, targetName, supported),
    targetName + ':' + selector
  );
}

/**
 * Dev warning for pseudo-class rules a stateless target can never match: each term of an entry is
 * tested against what the target supports (`STATELESS_PSEUDOS`), and a negated term never warns.
 * Skips buckets whose environmental gate (media / container / supports) does not currently
 * match, so a web-only rule fenced behind `@media (hover: hover)` stays silent on touch platforms.
 */
export function warnInertPseudoStates(
  entries: PseudoBearingConditionalStyle[],
  env: MediaQueryEnv,
  containerCtx: Pick<ContainerContextValue, 'named' | 'nearest'>,
  targetName: string
): void {
  const supported = STATELESS_PSEUDO_MASKS.get(targetName) ?? 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const pseudo = entry.type === 'pseudo' ? entry.condition : entry.pseudo;
    if (
      entry.type !== 'pseudo' &&
      entry.type !== 'attr' &&
      entry.type !== 'combinator' &&
      entry.type !== 'nthChild' &&
      entry.type !== 'has' &&
      !conditionMatches(entry, env, containerCtx)
    ) {
      continue;
    }

    // `negate` on a compound entry negates its attribute or structural gate, not the pseudo-class.
    const negated = (entry.type === 'pseudo' ? entry.negate : entry.pseudoNegate) === true;
    if (!negated && (supported & PSEUDO_BIT[pseudo]) === 0) {
      warnInertPseudo(pseudo, targetName, supported);
    }

    if (entry.and === undefined) continue;
    for (let j = 0; j < entry.and.length; j++) {
      const term = entry.and[j];
      if (!term.negate && (supported & PSEUDO_BIT[term.pseudo]) === 0) {
        warnInertPseudo(term.pseudo, targetName, supported);
      }
    }
  }
}

/** Whether a pseudo-class holds: interaction ones from the press `state`, element ones from `states`. */
export function pseudoActive(
  pseudo: PseudoState,
  state: InteractionState,
  states: number
): boolean {
  switch (pseudo) {
    case 'disabled':
      return (states & PSEUDO_BIT.disabled) !== 0;
    case 'enabled':
      return (states & PSEUDO_BIT.disabled) === 0;
    case 'focus':
      return !!state.focused;
    case 'hover':
      return !!state.hovered;
    case 'pressed':
      return !!state.pressed;
    case 'readOnly':
      return (states & PSEUDO_BIT.readWrite) === 0;
    case 'readWrite':
      return (states & PSEUDO_BIT.readWrite) !== 0;
  }
}

/** Whether every further term of a pseudo-class compound holds. */
function andTermsHold(and: PseudoTerm[], state: InteractionState, states: number): boolean {
  for (let i = 0; i < and.length; i++) {
    if (pseudoActive(and[i].pseudo, state, states) === and[i].negate) return false;
  }
  return true;
}

/** The layers of every pseudo-bearing entry whose pseudo-class and other gates hold now. */
export function pseudoStylesForState(
  entries: PseudoBearingConditionalStyle[],
  state: InteractionState,
  states: number,
  env: MediaQueryEnv,
  containerCtx: Pick<ContainerContextValue, 'named' | 'nearest'>,
  props: Record<string, unknown>,
  resolveEnv: ResolveEnv,
  parentCtx: ParentContextValue
): MatchedLayers {
  // Caller passes the precomputed `pseudoEntries` subset; every entry
  // is guaranteed pseudo-bearing (either `type==='pseudo'` or a
  // compound carrying `entry.pseudo`), so the inner branches skip the
  // membership re-check.
  const out: MatchedLayers = { normal: [], important: null };
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.type === 'pseudo') {
      const active = pseudoActive(entry.condition, state, states);
      if (
        (entry.negate ? !active : active) &&
        (entry.and === undefined || andTermsHold(entry.and, state, states))
      ) {
        pushMatched(out, entry, resolveEnv);
      }
      continue;
    }
    // Compound: every non-`pseudo` entry in this slice carries `entry.pseudo`.
    if (pseudoActive(entry.pseudo, state, states) === (entry.pseudoNegate === true)) continue;
    if (entry.and !== undefined && !andTermsHold(entry.and, state, states)) continue;
    // Attrs AND-gate for compound forms like `&[disabled]:hover`.
    if (entry.attrs) {
      const attrOk = attrMatches(entry, props);
      if (entry.negate ? attrOk : !attrOk) continue;
    }
    // Structural AND-gate for Tier 2 combinations like
    // `&:nth-child(2):hover` or `${Foo} > &:active`.
    if (entry.type === 'combinator') {
      if (!combinatorMatches(entry, parentCtx)) continue;
    } else if (entry.type === 'nthChild') {
      const matches = nthChildMatches(entry, parentCtx);
      if (entry.negate ? matches : !matches) continue;
    } else if (entry.type === 'has') {
      const matches = hasMatches(entry, props.children as React.ReactNode);
      if (entry.negate ? matches : !matches) continue;
    } else if (entry.type !== 'attr' && !conditionMatches(entry, env, containerCtx)) {
      // media / container / supports environmental gate.
      continue;
    }
    pushMatched(out, entry, resolveEnv);
  }
  return out;
}
