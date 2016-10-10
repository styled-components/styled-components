import css from '../constructors/css'

import styledNativeComponent from '../models/StyledNativeComponent'
import type { Interpolation, Target } from '../types'

const styled = (tag: Target) =>
  (strings: Array<string>, ...interpolations: Array<Interpolation>) =>
    styledNativeComponent(tag, css(strings, ...interpolations), { inline: true })


export { css }

export default styled
