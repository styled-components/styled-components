// @flow

export default (css: ?string): Array<Object> => {
  const _css = `${css || ''}` // Definitely a string, and a clone
  const existingComponents = []
  _css.replace(/^[^\S\n]*?\/\* sc-component-id:\s+(\S+)\s+\*\//mg, (match, componentId, matchIndex) => {
    existingComponents.push({ componentId, matchIndex })
    return match
  })
  return existingComponents.map(({ componentId, matchIndex }, i) => {
    const nextComp = existingComponents[i + 1]
    const cssFromDOM = nextComp ? _css.slice(matchIndex, nextComp.matchIndex) : _css.slice(matchIndex)
    return { componentId, cssFromDOM }
  })
}
