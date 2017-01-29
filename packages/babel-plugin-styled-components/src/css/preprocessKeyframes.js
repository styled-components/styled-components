import {
  temporaryClassname
} from './placeholderUtils'

import {
  convertOutputToBabelTypes,
  preprocessHelper
} from './preprocessUtils'

export default (cssArr, interpolationNodes) => (
  convertOutputToBabelTypes(
    preprocessHelper(
      cssArr,
      interpolationNodes,
      x => `@keyframes ${temporaryClassname} { ${x} }`,
      '' // no namespace
    )
  )
)
