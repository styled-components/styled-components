const colors = {
  blue: '#1B95E0',
  lightBlue: '#71C9F8',
  green: '#17BF63',
  orange: '#F45D22',
  purple: '#794BC4',
  red: '#E0245E',
  white: '#FFFFFF',
  yellow: '#FFAD1F',
  deepGray: '#657786',
  fadedGray: '#E6ECF0',
  faintGray: '#F5F8FA',
  gray: '#AAB8C2',
  lightGray: '#CCD6DD',
  textBlack: '#14171A'
};

const fontSize = {
  root: '14px',
  // font scale
  small: '0.85rem',
  normal: '1rem',
  large: '1.25rem'
};

const theme = {
  colors,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Helvetica Neue", sans-serif, ' +
    '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', // emoji fonts
  fontSize,
  lineHeight: 1.3125,
  spaceX: 0.6,
  spaceY: 1.3125,
  createLength(num, unit) {
    return `${num}${unit}`;
  }
};

export default theme;
