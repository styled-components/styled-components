// @flow
import type { Preprocessed } from '../types'
import prefixPreprocessedSelectors from '../utils/prefixPreprocessedSelectors'
import styleSheet from '../../models/StyleSheet'

export default class ComponentStyle {
  rules: Preprocessed;
  selector: ?string;

  constructor(rules: Preprocessed, selector: ?string) {
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
