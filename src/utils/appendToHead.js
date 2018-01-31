// @flow

/**
 * Append the element below the last found styled component style tag.
 * If no tags are found default to appending to the bottom of the head tag.
 * This prevents any side effects from pre rendered pages or when styles are added after first render.
 */
export default function appendToHead(el: HTMLStyleElement) {
  const scStyleTags = Array.from(
    document.querySelectorAll('style[data-styled-components]')
  )
  if (scStyleTags.length > 0) {
    const lastScStyleTag = scStyleTags[scStyleTags.length - 1]
    // $FlowFixMe
    lastScStyleTag.parentNode.insertBefore(el, lastScStyleTag.nextSibling)
    return
  }

  // $FlowFixMe
  document.head.appendChild(el)
}
