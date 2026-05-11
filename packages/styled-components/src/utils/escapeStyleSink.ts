/**
 * Escape `</style` inside CSS that will be embedded in a `<style>` element.
 *
 * The HTML tokenizer ends a `<style>` block at the first `</style`
 * substring (any case) regardless of CSS context, so a user-controlled
 * interpolation like
 *
 *   styled.div`color: ${"</style><script>alert(1)</script>"}`
 *
 * could otherwise close the tag and inject markup. Replacing the leading
 * `<` with the CSS hex escape `\3C` keeps the rendered CSS
 * character-equivalent (browsers parse `\3C` as `<` inside CSS values
 * and strings) while preventing the HTML tokenizer from terminating
 * the tag.
 *
 * Only required at server-side emit boundaries; CSSOM injection
 * (`insertRule`) is unaffected because the CSS engine receives the
 * declaration directly without any HTML round-trip.
 */
export function escapeCssForStyleTag(css: string): string {
  return /<\/style/i.test(css) ? css.replace(/<\/style/gi, '\\3C/style') : css;
}

/**
 * Escape characters that could break out of an HTML double-quoted attribute.
 * Used for nonces and other untrusted values that flow into raw `<style ...>`
 * tag construction (the `dangerouslySetInnerHTML` / React-element path is
 * already safe because React handles attribute escaping).
 */
export function escapeHtmlAttribute(value: string): string {
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c === 34 /* " */ || c === 38 /* & */ || c === 60 /* < */) {
      return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }
  }
  return value;
}
