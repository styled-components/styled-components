// @flow

export default (css: ?String): Array<Object> => {
  const [_, ...existingComponents] = (css || '').split(/^\/\* sc-component-id:/m)
  return (existingComponents || []).map(str => {
    const [componentId, componentCSS] = str.split(/\*\/$/m).map(s => s.trim())
    return { componentId, css: componentCSS }
  })
}
