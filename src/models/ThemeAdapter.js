export default (adapter, component) => {
  class ThemeAdapter extends component {
    getTheme(themeData) {
      return adapter(themeData)
    }
  }
  return ThemeAdapter
}
