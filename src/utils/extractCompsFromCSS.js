// @flow
const SC_COMPONENT_ID = /^[^\S\n]*?\/\* sc-component-id:\s*(\S+)\s+\*\//gm

type ExtractedComp = {
  componentId: string,
  cssFromDOM: string,
}

export default (maybeCSS: ?string): Array<ExtractedComp> => {
  const css = `${maybeCSS || ''}` // Definitely a string, and a clone
  const existingComponents = []
  css.replace(SC_COMPONENT_ID, (match, componentId, matchIndex) => {
    existingComponents.push({ componentId, matchIndex })
    return match
  })
  return existingComponents.map(({ componentId, matchIndex }, i) => {
    const nextComp = existingComponents[i + 1]
    const cssFromDOM = nextComp
      ? css.slice(matchIndex, nextComp.matchIndex)
      : css.slice(matchIndex)
    return { componentId, cssFromDOM }
  })
}
