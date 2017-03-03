const COMPACT_TIMEOUT = 15000

function Deffered() {
  this.promise = new Promise((resolve) => {
    this.resolve = resolve
  })
  this.then = this.promise.then.bind(this.promise)
}
const isBrowser = typeof document !== 'undefined'
const generateCssText = rules => Object.keys(rules).map(rule => rules[rule].cssText).join('\n')

function addCssPayload(tag, cssText) {
  if (!isBrowser) {
    return true
  }
  if (!tag) {
    tag = document.createElement('style')
    tag.type = 'text/css'
    tag.rel = 'stylesheet'
  }

  if (tag.styleSheet) {
    tag.styleSheet.cssText += cssText
  } else {
    tag.appendChild(document.createTextNode(cssText))
  }

  if (!tag.parentNode) {
    (document.head || document.getElementsByTagName('head')[0]).appendChild(tag)
  }
  return tag
}

class AsyncStyleSheet {
  inserted = {}
  _cssText = []
  _counter = 0
  _rules = {}
  _rulesHash = {}
  _waitForNextTick = 0
  _currentPromise = 0
  _globalTag = 0
  _activeTag = 0

  constructor() {
    this.clear()
  }

  addStyle(key, cssText) {
    if (!this._rulesHash[key]) {
      const _counter = this._counter++
      this._rules[_counter] = {
        key, cssText,
      }
      this._rulesHash[key] = this._createRule(_counter)
      this._cssText.push(cssText)

      this._triggerUpdate()
    }
    return this._rulesHash[key]
  }

  _createRule(ruleNumber) {
    return {
      promise: this._currentPromise.promise,
      remove: () => {
        delete this._rulesHash[this._rules[ruleNumber].key]
        delete this._rules[ruleNumber]
        this._triggerUpdate()
      },
    }
  }

  _triggerUpdate() {
    if (!this._waitForNextTick) {
      this._waitForNextTick = 1
      // TODO: should be replaced by setImmediate
      setTimeout(() => this._update(), 0)
    }
  }

  _flushStyles() {
    const tags = []
    tags.push(this._activeTag)
    tags.push(this._globalTag)

    this._cssText = []
    this._activeTag = 0
    this._globalTag = addCssPayload(0, generateCssText(this._rules))

    setTimeout(() => tags.forEach(tag => tag && tag.parentNode && tag.parentNode.removeChild(tag)), 0)
  }

  _compactStyles() {
    if (!this.compactTimeout) {
      this.compactTimeout = setTimeout(() => {
        this.compactTimeout = 0
        this._flushStyles()
      }, COMPACT_TIMEOUT)
    }
  }

  _update() {
    this._waitForNextTick = 0
    const lastPromise = this._currentPromise
    this._currentPromise = new Deffered()

    if (this._cssText) {
      this._activeTag = addCssPayload(this._activeTag, this._cssText.join('\n'))
      this._cssText = []
    }

    this._compactStyles()

    setTimeout(() => lastPromise.resolve(), 0)
  }

  forceFlush() {
    // flush NEVER means clear
    this._update()
  }

  clear() {
    this.inserted = {}
    this._cssText = []
    this._counter = 0
    this._rules = {}
    this._rulesHash = {}
    this._waitForNextTick = 0

    this._globalTag = 0
    this._activeTag = 0
    this._currentPromise = new Deffered()
  }

  rules() {
    const rules = this._rules
    return Object.keys(rules).sort((a, b) => a - b).map(rule => ({
      cssText: rules[rule].cssText,
    }))
  }

  get injected(): boolean {
    return !!((this._globalTag || this._activeTag))
  }

}

export default new AsyncStyleSheet()
