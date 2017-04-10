// @flow

export default (css: ?string): Array<Object> => {
  const [_, ...existingComponents] = (css || '').split(/^\/\* sc-component-id:/m)
  return (existingComponents || []).map(str => {
    const [componentId, cssFromDOM] = str.split(/\*\/$/m).map(s => s.trim())
    return { componentId, cssFromDOM }
  })
}
