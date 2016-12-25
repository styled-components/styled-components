import minify from './visitors/minify'
import displayNameAndId from './visitors/displayNameAndId'

export default function({ types: t }) {
  return {
    visitor: {
      TaggedTemplateExpression(path, state) {
        minify(path, state)
        displayNameAndId(path, state)
      }
    }
  }
}
