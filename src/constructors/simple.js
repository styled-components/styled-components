import rule from './rule'

export default (property, ...shorthands) => {
  const constructor = value => rule(property, value)
  shorthands.forEach(v => constructor[v] = constructor(v))
  return constructor
}
