export default obj => (props, theme) => {
  /* Copy new values into theme */
  Object.apply(theme, obj)
}
