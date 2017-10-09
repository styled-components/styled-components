// @flow
import determineTheme from '../determineTheme';

const theme = { color: 'red' }
const fallbackTheme = { color: 'blue' }

describe('determineTheme', () => {
  it('should take precedence over ThemeProvider', () => {
    expect(determineTheme({ theme }, fallbackTheme, { theme })).toEqual(theme);
  })

  it('should fallback to default theme', () => {
    expect(determineTheme({}, fallbackTheme, { theme })).toEqual(fallbackTheme)
  })
})
