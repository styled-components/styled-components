export default obj => (props, theme) => {
  Object.keys(obj).forEach(k => theme[k] = obj[k])
}
