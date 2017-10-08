// @flow
type Props = {
  theme?: any,
}

export default (props: Props, fallbackTheme: any, defaultProps: any) => {
  // Props should take precedence over ThemeProvider, which should take precedence over
  // defaultProps, but React automatically puts defaultProps on props.

  /* eslint-disable react/prop-types */
  const isDefaultTheme = defaultProps && props.theme === defaultProps.theme
  const theme = props.theme && !isDefaultTheme ? props.theme : fallbackTheme
  /* eslint-enable */

  return theme
}
