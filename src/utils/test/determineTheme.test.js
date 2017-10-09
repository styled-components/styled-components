// @flow
import determineTheme from '../determineTheme';

const theme = { color: 'red' }
const fallbackTheme = { color: 'blue' }
const props = { theme }
const defaultProps = props

describe('determineTheme', () => {
  it('should take precedence over ThemeProvider', () => {
    expect(determineTheme(props, fallbackTheme, defaultProps)).toEqual(theme)
  })

  it('should fallback to default theme', () => {
    expect(determineTheme({}, fallbackTheme, defaultProps)).toEqual(fallbackTheme)
  })
})
