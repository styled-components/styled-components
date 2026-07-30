import type { DeclResult, SCPlugin } from '../utils/compiler';

const WEBKIT = '-webkit-';
const MOZ = '-moz-';
const MS = '-ms-';

/** Emit `-webkit-prop` then `prop`. */
const KIND_WEBKIT = 1;
/** Emit `-moz-prop` then `prop`. */
const KIND_MOZ = 2;
/** Emit webkit + moz + ms + standard. */
const KIND_TRIPLE = 3;
/** Emit webkit + ms + standard. */
const KIND_WEBKIT_MS = 4;

/**
 * Property strategy table. Number entries are KIND_*; string entries are the
 * full renamed prefixed property (logical longhands). One lookup covers the
 * pass-through miss path so most declarations pay a single object probe.
 */
const PROPS: Record<string, number | string> = {
  appearance: KIND_TRIPLE,
  'backdrop-filter': KIND_WEBKIT,
  'box-decoration-break': KIND_WEBKIT,
  'clip-path': KIND_WEBKIT,
  'column-count': KIND_WEBKIT,
  'column-fill': KIND_WEBKIT,
  'column-gap': KIND_WEBKIT,
  'column-rule': KIND_WEBKIT,
  'column-rule-color': KIND_WEBKIT,
  'column-rule-style': KIND_WEBKIT,
  'column-rule-width': KIND_WEBKIT,
  'column-span': KIND_WEBKIT,
  'column-width': KIND_WEBKIT,
  columns: KIND_WEBKIT,
  filter: KIND_WEBKIT,
  'font-feature-settings': KIND_WEBKIT,
  hyphens: KIND_TRIPLE,
  'line-clamp': KIND_WEBKIT,
  'margin-inline-end': WEBKIT + 'margin-end',
  'margin-inline-start': WEBKIT + 'margin-start',
  mask: KIND_WEBKIT,
  'mask-clip': KIND_WEBKIT,
  'mask-composite': KIND_WEBKIT,
  'mask-image': KIND_WEBKIT,
  'mask-mode': KIND_WEBKIT,
  'mask-origin': KIND_WEBKIT,
  'mask-position': KIND_WEBKIT,
  'mask-repeat': KIND_WEBKIT,
  'mask-size': KIND_WEBKIT,
  'padding-inline-end': WEBKIT + 'padding-end',
  'padding-inline-start': WEBKIT + 'padding-start',
  'scroll-snap-type': KIND_WEBKIT,
  'tab-size': KIND_MOZ,
  'text-size-adjust': KIND_WEBKIT_MS,
  'user-select': KIND_TRIPLE,
  'writing-mode': KIND_WEBKIT,
};

function dual(prefixedProp: string, prop: string, value: string): DeclResult[] {
  return [
    { prop: prefixedProp, value },
    { prop, value },
  ];
}

function triple(prop: string, value: string): DeclResult[] {
  return [
    { prop: WEBKIT + prop, value },
    { prop: MOZ + prop, value },
    { prop: MS + prop, value },
    { prop, value },
  ];
}

/**
 * Vendor-prefix plugin for `<StyleSheetManager plugins={[prefixPlugin]}>`.
 *
 * Emits prefixed forms for CSS that CanIUse still marks as prefixed at the
 * React JS API browser floor (Chrome 45 / Firefox 36 / Safari 9 / Edge 12).
 * Flexbox, transforms, transitions, and animations are already unprefixed
 * at that floor and pass through unchanged.
 *
 * Opt in per subtree; the default StyleSheetManager emits unprefixed CSS.
 */
const prefixPlugin: SCPlugin = {
  name: 'prefix',
  decl(prop, value) {
    // Already-prefixed authored forms pass through untouched.
    if (prop.charCodeAt(0) === 45 /* - */) return undefined;

    if (prop === 'position') {
      if (value === 'sticky') {
        return [
          { prop: 'position', value: WEBKIT + 'sticky' },
          { prop: 'position', value: 'sticky' },
        ];
      }
      return undefined;
    }

    const entry = PROPS[prop];
    if (entry !== undefined) {
      if (typeof entry === 'string') return dual(entry, prop, value);
      if (entry === KIND_WEBKIT) return dual(WEBKIT + prop, prop, value);
      if (entry === KIND_MOZ) return dual(MOZ + prop, prop, value);
      if (entry === KIND_TRIPLE) return triple(prop, value);
      // KIND_WEBKIT_MS
      return [
        { prop: WEBKIT + prop, value },
        { prop: MS + prop, value },
        { prop, value },
      ];
    }

    // image-set() value rewrite (caniuse css-image-set). Cheap rejection first.
    if (value.indexOf('image-set(') !== -1 && value.indexOf('-webkit-image-set(') === -1) {
      return [
        { prop, value: value.split('image-set(').join(WEBKIT + 'image-set(') },
        { prop, value },
      ];
    }

    return undefined;
  },
  rw(selector) {
    // Cheap rejection: selector rewrite only for placeholder / read-* forms.
    if (selector.indexOf('::placeholder') === -1 && selector.indexOf(':read-') === -1) {
      return selector;
    }

    if (selector.indexOf('::placeholder') !== -1) {
      return [
        selector.split('::placeholder').join('::-webkit-input-placeholder'),
        selector.split('::placeholder').join('::-moz-placeholder'),
        selector.split('::placeholder').join(':-ms-input-placeholder'),
        selector,
      ];
    }

    if (selector.indexOf(':read-only') !== -1) {
      return [selector.split(':read-only').join(':-moz-read-only'), selector];
    }

    if (selector.indexOf(':read-write') !== -1) {
      return [selector.split(':read-write').join(':-moz-read-write'), selector];
    }

    return selector;
  },
};

export default prefixPlugin;
