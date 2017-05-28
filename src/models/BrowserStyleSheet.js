// @flow
/*
 * Browser Style Sheet with Rehydration
 *
 * <style data-styled-components="x y z"
 *        data-styled-components-is-local="true">
 *   /· sc-component-id: a ·/
 *   .sc-a { ... }
 *   .x { ... }
 *   /· sc-component-id: b ·/
 *   .sc-b { ... }
 *   .y { ... }
 *   .z { ... }
 * </style>
 *
 * Note: replace · with * in the above snippet.
 * */
import StyleSheet, { SC_ATTR, LOCAL_ATTR } from './StyleSheet'
import BrowserTag from './BrowserTag'
import InMemoryTag from './InMemoryTag'

/* Factory function to separate DOM operations from logical ones*/
export default {
  create() {
    const tags = []
    const names = {}

    /* Construct existing state from DOM */
    const nodes = document.querySelectorAll(`[${SC_ATTR}]`)
    const nodesLength = nodes.length

    for (let i = 0; i < nodesLength; i += 1) {
      const el = nodes[i]

      const isLocal = el.getAttribute(LOCAL_ATTR) === 'true'
      tags.push(new InMemoryTag(true, isLocal, new BrowserTag(el, isLocal, el.innerHTML)))

      const attr = el.getAttribute(SC_ATTR)
      if (attr) {
        attr.trim().split(/\s+/).forEach(name => {
          names[name] = true
        })
      }
    }

    return new StyleSheet(true, tags, names)
  },
}
