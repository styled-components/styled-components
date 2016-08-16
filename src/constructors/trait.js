import concat from './concat'

export default (name, definitions, cb) => {
  const flatDefinitions = {}
  const _throw = message => {
    throw new Error(`${message}\nValid values for '${name}' are:\n${Object.keys(flatDefinitions).join('\n')}`)
  }
  Object.keys(definitions).forEach(category => {
    Object.keys(definitions[category]).forEach(option => {
      if (option === 'default') return
      if (flatDefinitions[option]) _throw(`Already have a definition for '${option}' as a '${flatDefinitions[option].category}'!`)
      flatDefinitions[option] = { category, option, value: definitions[category][option] }
    })
  })
  return (valueString = '') => {
    const values = valueString.split(/ +/)
    const obj = {}
    values.filter(x => x).forEach(v => {
      const definition = flatDefinitions[v]
      if (!definition) _throw(`Unknown value '${v}' for ${name}.`)
      const { category } = definition
      if (obj[category]) _throw(`More than one '${category} specified for ${name}: encountered '${v}' but already had seen '${obj[category].option}'.`)
      obj[category] = definition
    })
    Object.keys(definitions).forEach(category => {
      if (typeof obj[category] === 'undefined') {
        if (typeof definitions[category].default === 'undefined') _throw(`No provided value for category '${category}' and no default specified.`)
        obj[category] = definitions[category].default
      } else {
        obj[category] = obj[category].value
      }
    })
    return cb ? cb(obj) : concat(...Object.keys(obj).map(k => obj[k]))
  }
}
