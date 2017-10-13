// @flow

const ports = new Map()
const styles = new Map()
const map = Array.prototype.map

export const syncViews = () => {
  const cssText = map.call(global.document.querySelectorAll('head style[data-styled-components]'), style => (style.innerHTML)).join('\n')
  styles.forEach(style => {
    const el = style
    el.innerHTML = cssText
  })
}
export const registerDoc = (document: global.HTMLDocument) => {
  if (!ports.has(document)) {
    ports.set(document, 1)
    const st = document.createElement('style')
    document.head.append(st)
    styles.set(document, st)
    syncViews()
  } else {
    ports.set(document, ports.get(document) + 1)
  }
}
export const unregisterDoc = (document: global.HTMLDocument) => {
  if (ports.has(document)) {
    const counter = ports.get(document)
    if (counter) {
      ports.set(document, counter - 1)
    } else {
      ports.delete(document)
    }
  }
}
