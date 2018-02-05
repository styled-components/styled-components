// @flow
/**
 * When using streaming rendering, style blocks are emitted in chunks directly
 * next to the HTML they reference. In order to prevent errors during rehydration
 * (since React doesn't know about the style blocks we are interleaving) this
 * method relocates all styled-component blocks to the end of `<head>`.
 *
 * NOTE: this method MUST be called before ReactDOM.hydrate().
 */
export default function consolidateStreamedStyles() {
  const blocks = Array.from(
    document.querySelectorAll('style[data-styled-components]')
  )

  if (blocks.length) {
    const frag = document.createDocumentFragment()

    for (let i = 0, len = blocks.length; i < len; i += 1) {
      // $FlowFixMe
      frag.appendChild(blocks[i].parentNode.removeChild(blocks[i]))
    }

    // $FlowFixMe
    document.head.appendChild(frag)
  }
}
