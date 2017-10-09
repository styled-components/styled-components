// @flow
import determineTheme from '../determineTheme';

const theme = { color: 'red' }
const fallback = { color: 'blue' }
const props = { theme }

describe('determineTheme', () => {
  it('should take precedence over defaultProps', () => {
    expect(determineTheme(props, undefined, props)).toEqual(theme)
  })

  it('should take precedence over ThemeProvider', () => {
    expect(determineTheme(props, fallback, props)).toEqual(fallback)
  })

  it('should fallback to default theme', () => {
    expect(determineTheme({}, fallback, props)).toEqual(fallback)
  })
})
