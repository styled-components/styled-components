import { warnOnce } from './dev';

/**
 * Bidirectional control characters. These can be used to spoof visual
 * ordering of text and hide the true content of a string; most famously
 * exploited against source code (Trojan Source, CVE-2021-42574) but
 * equally applicable to CSS values where a `url()` could be visually
 * reordered to disguise the real target. We strip them unconditionally.
 *
 * - U+200E / U+200F: LTR / RTL mark
 * - U+202A..U+202E: embedding + override
 * - U+2066..U+2069: isolate family
 */
function isBidiControl(c: number): boolean {
  return (
    c === 0x200e || c === 0x200f || (c >= 0x202a && c <= 0x202e) || (c >= 0x2066 && c <= 0x2069)
  );
}

/**
 * Control characters we reject outright. CSS allows TAB/LF/FF/CR/SPACE
 * and the char-range inside strings/url() per the spec's hex-escape
 * grammar, but a raw control byte inside a declaration value is never
 * legitimate; in practice it's either editor corruption or an
 * injection attempt. Whitespace-class control chars are tolerated by
 * the tokenizer upstream; everything else in U+0000..U+001F and U+007F
 * is suspect.
 */
function isDisallowedControl(c: number): boolean {
  if (c === 0 /* NUL; used as sentinel prefix; preserved and validated separately */) return false;
  if (c === 9 || c === 10 || c === 12 || c === 13 || c === 11) return false; // TAB / LF / FF / CR / VT
  if (c < 0x20) return true; // C0 controls minus whitespace
  if (c === 0x7f) return true; // DEL
  // U+FFF9..U+FFFB interlinear annotation, U+FFFE/U+FFFF non-characters
  if (c >= 0xfff9 && c <= 0xfffb) return true;
  if (c === 0xfffe || c === 0xffff) return true;
  return false;
}

/**
 * Pre-tokenize sanitize pass. Strips BiDi controls and disallowed
 * control bytes. One-time dev warning per offending pattern so
 * repeated bad input doesn't spam.
 *
 * String-in / string-out. Returns the input unmodified in the common
 * (well-formed) case via an early-exit scan, so the hot path pays for
 * one O(n) loop with no allocation.
 */
export function sanitizeValue(value: string): string {
  // Fast-path scan: look for any character requiring sanitization.
  // The common case (valid CSS) returns here with zero allocations.
  let needsRewrite = false;
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c < 0x20 && c !== 9 && c !== 10 && c !== 11 && c !== 12 && c !== 13) {
      if (c !== 0) {
        needsRewrite = true;
        break;
      }
    }
    if (c === 0x7f) {
      needsRewrite = true;
      break;
    }
    if (c >= 0x80 && (isBidiControl(c) || isDisallowedControl(c))) {
      needsRewrite = true;
      break;
    }
  }

  if (!needsRewrite) return value;

  // Slow path: strip the offending characters, warn once.
  if (process.env.NODE_ENV !== 'production') {
    warnOnce(
      'control-char',
      'Style value contained control / bidirectional characters. These were stripped to prevent ordering-spoof injection.'
    );
  }
  let out = '';
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c === 0) {
      out += value[i]; // NUL kept; sentinel prefix
      continue;
    }
    if (isDisallowedControl(c) || (c >= 0x80 && isBidiControl(c))) continue;
    out += value[i];
  }
  return out;
}

/**
 * Reject theme-path segments that would enable prototype pollution. Called
 * by the sentinel parser; a malicious CSS author could interpolate
 * `\0sc:__proto__.polluted:0` into a template and write into the
 * shared prototype chain when the resolver walks the path.
 */
export function isSafeThemePath(path: string): boolean {
  if (!path) return false;
  const segments = path.split('.');
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg === '__proto__' || seg === 'constructor' || seg === 'prototype') return false;
  }
  return true;
}
