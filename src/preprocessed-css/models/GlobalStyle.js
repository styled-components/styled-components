// @flow
import type { FlatPreprocessed } from '../types'
import prefixPreprocessedSelectors from '../utils/prefixPreprocessedSelectors'
import styleSheet from '../../models/StyleSheet'

export default class ComponentStyle {
  rules: FlatPreprocessed;
  selector: ?string;

  constructor(rules: FlatPreprocessed, selector: ?string) {
    this.rules = rules
    this.selector = selector
  }

  generateAndInject() {
    if (!styleSheet.injected) styleSheet.inject()

    const flatCSS = this.rules
      .map(css => (
        this.selector ?
          prefixPreprocessedSelectors(this.selector, css) :
          css
      ).join(''))
      .join('')

    styleSheet.insert(flatCSS)
  }
}
