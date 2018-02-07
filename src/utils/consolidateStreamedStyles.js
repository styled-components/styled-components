// @flow
/**
 * When using streaming rendering, style blocks are emitted in chunks directly.
 * This method used to be necessary to move all style elements before the
 * rehydration kicks in. However the rehydration now takes all SSR style tags,
 * combines them into a single tag, and adds it to the head.
 * This renders the consolidation useless
 */
export default function consolidateStreamedStyles() {
  /* noop */
}
