import BrowserTag from './BrowserTag'
import { SC_ATTR, LOCAL_ATTR } from './StyleSheet'

export default class InMemoryTag {
  onBrowser: boolean
  isLocal: boolean
  components: { [string]: Object }
  size: number
  names: Array<string>
  browserTag: ?BrowserTag

  constructor(onBrowser: boolean, isLocal: boolean, browserTag: ?BrowserTag) {
    this.onBrowser = onBrowser
    this.isLocal = isLocal
    this.browserTag = browserTag
    this.size = !browserTag ? 0 : browserTag.size
    this.names = !browserTag || !browserTag.el ? [] : browserTag.el.getAttribute(SC_ATTR).split(' ')

    this.components = !browserTag ? {} :
      Object.keys(browserTag.components).reduce((accum, componentId) => {
        const browserTagComp = browserTag.components[componentId]
        browserTagComp.index = 1
        return { ...accum, [componentId]: { componentId, css: [browserTagComp.cssFromDOM] } }
      }, {})
  }

  isFull() {
    return this.browserTag ? this.browserTag.isFull() : false
  }

  addComponent(componentId: string) {
    if (this.components[componentId]) throw new Error(`Trying to add Component '${componentId}' twice!`)
    this.components[componentId] = { componentId, css: [] }
    this.size += 1
  }

  inject(componentId: string, css: string, name: ?string) {
    const comp = this.components[componentId]
    console.log(`IMT inject ${css}`)

    if (!comp) throw new Error('Must add a new component before you can inject css into it')
    if (comp.css.length === 0) comp.css.push(`\n/* sc-component-id: ${componentId} */\n`)

    comp.css.push(css.trim().replace(/\n*$/, '\n'))

    if (name) this.names.push(name)
  }

  flush() {
    console.log("IMT flush")
    if (!this.onBrowser) return

    if (!this.browserTag) {
      const el = document.createElement('style')
      el.type = 'text/css'
      el.setAttribute(SC_ATTR, '')
      el.setAttribute(LOCAL_ATTR, this.isLocal ? 'true' : 'false')
      if (!document.head) throw new Error('Missing document <head>')
      document.head.appendChild(el)
      this.browserTag = new BrowserTag(el, this.isLocal)
    }

    this.browserTag.flush(this)
  }

  toHTML() {
    const namesAttr = `${SC_ATTR}="${this.names.join(' ')}"`
    const localAttr = `${LOCAL_ATTR}="${this.isLocal ? 'true' : 'false'}"`
    const css = Object.keys(this.components)
      .map(key => this.components[key].css.join(''))
      .join('')

    return `<style type="text/css" ${namesAttr} ${localAttr}>\n${css}\n</style>`
  }

  toReactElement(key: string) {
    const attributes = {
      [SC_ATTR]: this.names.join(' '),
      [LOCAL_ATTR]: this.isLocal.toString(),
    }
    const css = Object.keys(this.components)
      .map(k => this.components[k].css)
      .join('')

    return (
      <style
        key={key} type="text/css" {...attributes}
        dangerouslySetInnerHTML={{ __html: css }}
      />
    )
  }

  clone() {
    if (this.browserTag) throw new Error('BrowserTag cannot be cloned!')
    const copy = new InMemoryTag(this.onBrowser, this.isLocal)
    copy.names = [].concat(this.names)
    copy.size = this.size
    copy.components = Object.keys(this.components)
      .reduce((acc, key) => {
        const { componentId, css } = this.components[key]
        acc[key] = { componentId, css: [...css] } // eslint-disable-line no-param-reassign
        return acc
      }, {})

    return copy
  }
}
