/**
 * Filled-chip styling for small uppercase labels OVERLAID on top of a
 * visual element (gradient card, filter tile, swatch, shadow card,
 * etc.). The chip gives the label a legible scrim against arbitrary
 * background content. Use only when the label sits on top of content;
 * row labels, axis-tick labels, and in-flow captions should be plain
 * text without the chip. Symmetric inverse across modes:
 *
 *   light mode → translucent white fill + dark text
 *   dark mode  → translucent black fill + cream text
 *
 * Uses `light-dark()` rather than `@media (prefers-color-scheme: dark)`
 * so the v7 engine's resolver re-evaluates on every scheme change
 * (iOS sim system toggle, OS-level dark mode flip, etc.) without
 * needing the wrapping styled component to live on a media-subscribed
 * render path. Plain string so the parent template inlines this body
 * verbatim.
 *
 * Spread via tagged-template interpolation:
 *
 *   const RowLabel = styled.Text`
 *     ...host styles...
 *     ${darkChip}
 *   `;
 *
 * Hex literals (not theme tokens) because `t.colors.ink` / `t.colors.bg`
 * resolve to the *active* theme's palette - swapping them would invert
 * the chip and defeat the symmetric design. Alignment is intentionally
 * *not* part of this mixin; each call site owns where the chip sits.
 */
export const darkChip = `
  padding: 4px 8px;
  background-color: light-dark(rgba(255, 255, 255, 0.78), rgba(0, 0, 0, 0.78));
  color: light-dark(#0e0e10, #f5f3ee);
  text-align: center;
`;
