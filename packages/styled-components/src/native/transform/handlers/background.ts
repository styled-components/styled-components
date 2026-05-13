import { Dict } from '../../../types';
import { splitTopLevelCommas } from '../../../parser/parser';
import { warnOnce } from '../dev';
import { isMultiTokenPosition, substituteBackgroundSizeKeywordsForNative } from '../passthrough';
import { consumeColor } from '../shorthandHelpers';
import { tokenize } from '../tokenize';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

/**
 * CSS Backgrounds 3 §2.10 — `background` shorthand.
 *
 * Sets all eight background longhands: `background-image`,
 * `background-position`, `background-size`, `background-repeat`,
 * `background-origin`, `background-clip`, `background-attachment`,
 * `background-color`. Comma-separated layers; only the final layer
 * may carry `background-color`. Position / size split by `/`.
 *
 * RN coverage limits: iOS / Android honor `backgroundColor` and the
 * `experimental_background*` prefixed image / position / size / repeat
 * keys; they have no surface for `background-attachment`,
 * `background-origin`, `background-clip`. rn-web honors all eight via
 * the browser. Non-surface declarations on native emit warnOnce.
 */

const POSITION_KEYWORDS = new Set(['top', 'right', 'bottom', 'left', 'center']);
const SIZE_KEYWORDS = new Set(['cover', 'contain', 'auto']);
// Per CSS Backgrounds 3 §2.5 `<repeat-style>` grammar:
//   `repeat-x | repeat-y | [ repeat | space | round | no-repeat ]{1,2}`
// `repeat-x` and `repeat-y` are valid only as the single-token form.
// `repeat repeat` / `space round` / etc. are valid two-token forms.
const SINGLE_REPEAT_KEYWORDS = new Set(['repeat-x', 'repeat-y']);
const TWO_VALUE_REPEAT_KEYWORDS = new Set(['repeat', 'no-repeat', 'space', 'round']);
const ATTACHMENT_KEYWORDS = new Set(['scroll', 'fixed', 'local']);
const BOX_KEYWORDS = new Set(['content-box', 'padding-box', 'border-box']);
const NONE_IDENT = 'none';

interface ParsedLayer {
  image: string | null;
  position: string | null;
  size: string | null;
  repeat: string | null;
  attachment: string | null;
  origin: string | null;
  clip: string | null;
  color: string | null;
}

function emptyLayer(): ParsedLayer {
  return {
    image: null,
    position: null,
    size: null,
    repeat: null,
    attachment: null,
    origin: null,
    clip: null,
    color: null,
  };
}

function isLengthLike(t: Token): boolean {
  return t.kind === TokenKind.Length || t.kind === TokenKind.Percent || t.kind === TokenKind.Number;
}

function isPositionToken(t: Token): boolean {
  if (isLengthLike(t)) return true;
  if (t.kind === TokenKind.Ident && t.name !== undefined && POSITION_KEYWORDS.has(t.name))
    return true;
  return false;
}

function isSizeToken(t: Token): boolean {
  if (isLengthLike(t)) return true;
  if (t.kind === TokenKind.Ident && t.name !== undefined && SIZE_KEYWORDS.has(t.name)) return true;
  return false;
}

function parseLayer(layerSrc: string, isFinal: boolean): ParsedLayer | null {
  // Slashes are part of the layer grammar (position / size split); the
  // shared `withoutSlashes` helper would strip them, so we tokenize the
  // layer's source directly and let the loop dispatch on the slash.
  const tokens = tokenize(layerSrc);
  const stream = new TokenStream(tokens);
  const layer = emptyLayer();
  const positionTokens: string[] = [];
  const sizeTokens: string[] = [];
  const repeatTokens: string[] = [];
  let sawSlash = false;
  let boxSlot = 0;

  while (!stream.eof()) {
    const t = stream.peek()!;

    // Slash separator: enters a 1-2 size-token sub-state.
    if (t.kind === TokenKind.Slash) {
      if (positionTokens.length === 0 || sawSlash) return null;
      sawSlash = true;
      stream.consume();
      // Consume 1-2 size tokens, then return to the general loop.
      const first = stream.peek();
      if (first === undefined || !isSizeToken(first)) return null;
      sizeTokens.push(first.raw);
      stream.consume();
      const second = stream.peek();
      if (second !== undefined && isSizeToken(second)) {
        sizeTokens.push(second.raw);
        stream.consume();
      }
      continue;
    }

    // Image (gradient / url / none).
    if (
      t.kind === TokenKind.Function &&
      (t.name === 'linear-gradient' ||
        t.name === 'radial-gradient' ||
        t.name === 'conic-gradient' ||
        t.name === 'repeating-linear-gradient' ||
        t.name === 'repeating-radial-gradient' ||
        t.name === 'url')
    ) {
      if (layer.image !== null) return null;
      layer.image = t.raw;
      stream.consume();
      continue;
    }
    if (t.kind === TokenKind.Ident && t.name === NONE_IDENT && layer.image === null) {
      layer.image = NONE_IDENT;
      stream.consume();
      continue;
    }

    // Position tokens (1-4 consecutive position values BEFORE the slash).
    if (isPositionToken(t) && positionTokens.length < 4) {
      positionTokens.push(t.raw);
      stream.consume();
      continue;
    }

    // Repeat-style: single-form (`repeat-x` / `repeat-y`) takes one token
    // only; two-value form takes up to 2 of the symmetric keywords. Spec
    // explicitly excludes the single-form keywords from the two-token slot.
    if (
      t.kind === TokenKind.Ident &&
      t.name !== undefined &&
      SINGLE_REPEAT_KEYWORDS.has(t.name) &&
      repeatTokens.length === 0
    ) {
      repeatTokens.push(t.raw);
      stream.consume();
      continue;
    }
    if (
      t.kind === TokenKind.Ident &&
      t.name !== undefined &&
      TWO_VALUE_REPEAT_KEYWORDS.has(t.name) &&
      repeatTokens.length < 2 &&
      // Mixed forms are invalid: once a two-value keyword is consumed
      // the next slot cannot be a single-form keyword (above), and a
      // previously-consumed single-form keyword closes the slot.
      (repeatTokens.length === 0 || !SINGLE_REPEAT_KEYWORDS.has(repeatTokens[0]))
    ) {
      repeatTokens.push(t.raw);
      stream.consume();
      continue;
    }

    // Attachment.
    if (
      t.kind === TokenKind.Ident &&
      t.name !== undefined &&
      ATTACHMENT_KEYWORDS.has(t.name) &&
      layer.attachment === null
    ) {
      layer.attachment = t.raw;
      stream.consume();
      continue;
    }

    // Box keywords: first → origin, second → clip (or both = same value).
    if (
      t.kind === TokenKind.Ident &&
      t.name !== undefined &&
      BOX_KEYWORDS.has(t.name) &&
      boxSlot < 2
    ) {
      if (boxSlot === 0) {
        layer.origin = t.raw;
        layer.clip = t.raw;
      } else {
        layer.clip = t.raw;
      }
      boxSlot++;
      stream.consume();
      continue;
    }

    // Color — only valid on the final layer.
    const colorTok = consumeColor(stream);
    if (colorTok !== null) {
      if (!isFinal) return null;
      if (layer.color !== null) return null;
      layer.color = colorTok.raw;
      continue;
    }

    return null;
  }

  if (positionTokens.length > 0) layer.position = positionTokens.join(' ');
  if (sizeTokens.length > 0) layer.size = sizeTokens.join(' ');
  if (repeatTokens.length > 0) layer.repeat = repeatTokens.join(' ');
  return layer;
}

export function backgroundShorthand(tokens: Token[]): Dict<any> | null {
  // The tokenizer already operates over the whole declaration; to reach
  // layers we round-trip through the original source string the parser
  // tracks on each token. Reconstruct per-layer source via splitTopLevelCommas
  // on the joined raw form, since layer parsing is bracket-aware (gradient
  // commas don't split layers).
  const raw = tokens
    .map(t => t.raw)
    .join(' ')
    .trim();
  if (raw.length === 0) return null;

  const layerSources = splitTopLevelCommas(raw, true);
  const layers: ParsedLayer[] = [];
  for (let i = 0; i < layerSources.length; i++) {
    const parsed = parseLayer(layerSources[i], i === layerSources.length - 1);
    if (parsed === null) return null;
    layers.push(parsed);
  }
  if (layers.length === 0) return null;

  // Warn for unsupported native surfaces.
  const finalLayer = layers[layers.length - 1];
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (__DEV__ && !__NATIVE_WEB__ && layer.attachment === 'fixed') {
      warnOnce(
        'native-background-attachment-fixed',
        '`background-attachment: fixed` is ignored on React Native because iOS and Android do not expose scroll-anchored backgrounds. rn-web keeps it.',
        'fixed'
      );
    }
    if (__DEV__ && !__NATIVE_WEB__ && layer.origin !== null && layer.origin !== 'padding-box') {
      warnOnce(
        'native-background-origin-unsupported',
        '`background-origin: ' +
          layer.origin +
          '` is ignored on React Native. Native backgrounds paint from the default box on iOS and Android; rn-web keeps the authored value.',
        layer.origin
      );
    }
    if (__DEV__ && !__NATIVE_WEB__ && layer.clip !== null && layer.clip !== 'border-box') {
      warnOnce(
        'native-background-clip-unsupported',
        '`background-clip: ' +
          layer.clip +
          '` is ignored on React Native. rn-web keeps the authored value. For `background-clip: text`, use a dedicated native text rendering library.',
        layer.clip
      );
    }
  }

  // Color-only final layers drop out of the comma list and just feed
  // backgroundColor. This keeps the image / position / size / repeat
  // declarations clean and avoids emitting a trailing `none` entry that
  // some downstream renderers might choke on.
  const imageLayers =
    finalLayer.color !== null && finalLayer.image === null ? layers.slice(0, -1) : layers;

  // Per CSS Backgrounds 3 §2.10, the shorthand always resets every
  // longhand it controls. `background: url(...)` (image-only) must
  // reset `background-color` to its initial value so a prior
  // `background-color: red` declaration is cleared, not preserved.
  const out: Dict<any> = {};
  out.backgroundColor = finalLayer.color ?? 'transparent';

  if (imageLayers.length > 0) {
    const images = imageLayers.map(l => l.image ?? 'none').join(', ');
    const positions = imageLayers.map(l => l.position ?? '0% 0%').join(', ');
    const sizes = imageLayers.map(l => l.size ?? 'auto').join(', ');
    const repeats = imageLayers.map(l => l.repeat ?? 'repeat').join(', ');

    out.experimental_backgroundImage = images;
    out.backgroundImage = images;
    out.experimental_backgroundPosition = positions;
    // `backgroundPosition` (rn-web key) is skipped for multi-token forms;
    // see `isMultiTokenPosition` in passthrough.ts. rn-web's validator
    // would have dropped the value with a console.error otherwise.
    if (!isMultiTokenPosition(positions)) out.backgroundPosition = positions;
    // `experimental_backgroundSize` folds `cover` / `contain` to `auto`
    // (see `substituteBackgroundSizeKeywordsForNative` in passthrough.ts).
    out.experimental_backgroundSize = substituteBackgroundSizeKeywordsForNative(sizes);
    out.backgroundSize = sizes;
    out.experimental_backgroundRepeat = repeats;
    out.backgroundRepeat = repeats;
  }

  return out;
}
