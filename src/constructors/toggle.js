/* Set a bunch of flags and call a callback */
export default (name, cb) => valueString => {
  const values = valueString.split(/ +/)
  const obj = {}
  values.forEach(v => obj[v] = true)
  return cb(obj)
}
