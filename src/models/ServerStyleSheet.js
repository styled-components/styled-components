// @flow

import { Tag, StyleSheet } from './BrowserStyleSheet'

class ServerTag implements Tag {
  isLocal: boolean
  components: Map<string, Object>

  constructor(isLocal: boolean) {
    this.isLocal = isLocal
    this.components = new Map()
  }

  isFull() {
    return false
  }

  inject(componentId: string, css: string, name: ?string) {
    const comp = this.getComponent(componentId)
    comp.css += css.replace(/\n*$/, '\n')
    if (name) comp.names.push(name)
  }

  getComponent(componentId: string) {
    const existingComp = this.components.get(componentId)
    if (existingComp) return existingComp

    const css = `/* sc-component-id: ${componentId} */\n`
    const comp = { componentId, css, names: [] }
    this.components.set(componentId, comp)
    return comp
  }
}

/* Factory function to separate DOM operations from logical ones*/
const createServerStyleSheet = () => {
  /* Factory for making more tags. Very little to do here. */
  return new StyleSheet((isLocal) => new ServerTag(isLocal))
}

export default class ServerStyleSheet {
  instance: StyleSheet

  constructor() {
    this.instance = createServerStyleSheet()
  }

  collectStyles(children: any) {
    console.log(children)
  }
}
