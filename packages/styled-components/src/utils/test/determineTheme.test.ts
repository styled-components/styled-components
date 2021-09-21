import determineTheme from '../determineTheme';

const theme = { color: 'red' };
const fallback = { color: 'blue' };
const props = { theme };
const defaultProps = { theme: fallback };

describe('determineTheme', () => {
  it('should take precedence over ThemeProvider', () => {
    expect(determineTheme(props, fallback, defaultProps)).toEqual(theme);
  });

  it('should fallback to default theme', () => {
    expect(determineTheme({}, fallback, props)).toEqual(fallback);
  });

  it('should be undefined when no theme is passed', () => {
    expect(determineTheme({}, undefined, undefined)).toEqual(undefined);
  });
});
