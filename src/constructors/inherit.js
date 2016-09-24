export default keys => (props, theme) => (
  keys.split(' ').map(k => theme[k]).join(";")
)
