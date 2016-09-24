export default (key, fallback) => (props, theme) => (
  theme[key] || fallback
)
