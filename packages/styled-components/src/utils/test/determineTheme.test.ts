import determineTheme from '../determineTheme';

const theme = { color: 'red' };
const fallback = { color: 'blue' };
const props = { theme };

describe('determineTheme', () => {
  it('should take precedence over ThemeProvider', () => {
    expect(determineTheme(props, fallback)).toEqual(theme);
  });

  it('should fallback to the provided theme when props has no theme', () => {
    expect(determineTheme({}, fallback)).toEqual(fallback);
  });

  it('should be undefined when no theme is passed', () => {
    expect(determineTheme({}, undefined)).toEqual(undefined);
  });
});
