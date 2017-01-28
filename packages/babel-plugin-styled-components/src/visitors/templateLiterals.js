import {
  useCSSPreprocessor,
  useTranspileTemplateLiterals
} from '../utils/options'

import preprocessTemplateLiterals from './preprocessTemplateLiterals'
import transpileTemplateLiterals from './transpileTemplateLiterals'

export default (path, state) => {
  // We can only do one or the other, but preprocessing
  // disables the normal transpilation, obviously
  if (useCSSPreprocessor(state)) {
    preprocessTemplateLiterals(path, state)
  } else if (useTranspileTemplateLiterals(state)) {
    transpileTemplateLiterals(path, state)
  }
}
