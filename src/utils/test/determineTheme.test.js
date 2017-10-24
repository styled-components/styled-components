// @flow
import determineTheme from '../determineTheme';

const theme = { color: 'red' }
const fallback = { color: 'blue' }
const props = { theme }
const defaultProps = { theme: fallback }

describe('determineTheme', () => {
  it('should take precedence over ThemeProvider', () => {
    expect(determineTheme(props, fallback, defaultProps)).toEqual(theme)
  })

  it('should fallback to default theme', () => {
    expect(determineTheme({}, fallback, props)).toEqual(fallback)
  })
})
