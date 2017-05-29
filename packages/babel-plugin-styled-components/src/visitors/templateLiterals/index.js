import {
  useCSSPreprocessor,
  useTranspileTemplateLiterals
} from '../../utils/options'

import preprocess from './preprocess'
import transpile from './transpile'

export default (path, state) => {
  // We can only do one or the other, but preprocessing
  // disables the normal transpilation, obviously
  if (useCSSPreprocessor(state)) {
    preprocess(path, state)
  } else if (useTranspileTemplateLiterals(state)) {
    transpile(path, state)
  }
}
