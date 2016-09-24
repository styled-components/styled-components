export default obj => (props, theme) => {
  Object.keys(obj).forEach(k => {
    /* eslint-disable no-param-reassign */
    theme[k] = obj[k]
  })
}
