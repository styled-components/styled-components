import minify from './visitors/minify'
import displayNameAndId from './visitors/displayNameAndId'
import transpileTemplateLiterals from './visitors/transpileTemplateLiterals'

export default function({ types: t }) {
  return {
    visitor: {
      TaggedTemplateExpression(path, state) {
        minify(path, state)
        displayNameAndId(path, state)
        transpileTemplateLiterals(path, state)
      }
    }
  }
}
