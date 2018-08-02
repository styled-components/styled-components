import { canUseDOM } from 'fbjs/lib/ExecutionEnvironment';
import { Dimensions, Platform } from 'react-native';

const baseFontSize = 14;
const baseUnit = 1.3125;

const createPlatformLength = multiplier =>
  Platform.select({ web: `${multiplier}rem`, default: multiplier * baseFontSize });

/**
 * Exported variables
 */

export const borderRadii = {
  normal: Platform.select({ web: '0.35rem', default: 5 }),
  infinite: '9999px'
};

export const breakpoints = {
  small: 360,
  medium: 600,
  large: 800,
  xLarge: 1100
};

/**
 * Color palette
 * DO NOT add new colors unless they are part of @design's color palette.
 * DO NOT use colors that are not specified here.
 * source: go/uicolors
 */
export const colors = {
  // Primary
  blue: '#1DA1F2',
  purple: '#794BC4',
  green: '#17BF63',
  yellow: '#FFAD1F',
  orange: '#F45D22',
  red: '#E0245E',
  // Text and interface grays
  textBlack: '#14171A',
  deepGray: '#657786',
  mediumGray: '#AAB8C2',
  lightGray: '#CCD6DD',
  fadedGray: '#E6ECF0',
  faintGray: '#F5F8FA',
  white: '#FFF',
  textBlue: '#1B95E0'
};

export const fontFamilies = {
  normal: 'System',
  japan: Platform.select({
    web:
      'Arial, "ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro", Osaka, "メイリオ", Meiryo, "ＭＳ Ｐゴシック", "MS PGothic", sans-serif',
    default: 'System'
  }),
  rtl: Platform.select({ web: 'Tahoma, Arial, sans-serif', default: 'System' })
};

export const fontSizes = {
  // font scale
  small: createPlatformLength(0.85),
  normal: createPlatformLength(1),
  large: createPlatformLength(1.25),
  xLarge: createPlatformLength(1.5),
  jumbo: createPlatformLength(2)
};

export const lineHeight = Platform.select({ web: `${baseUnit}` });

export const spaces = {
  // This set of space variables should be used for margin, padding
  micro: createPlatformLength(baseUnit * 0.125),
  xxSmall: createPlatformLength(baseUnit * 0.25),
  xSmall: createPlatformLength(baseUnit * 0.5),
  small: createPlatformLength(baseUnit * 0.75),
  medium: createPlatformLength(baseUnit),
  large: createPlatformLength(baseUnit * 1.5),
  xLarge: createPlatformLength(baseUnit * 2),
  xxLarge: createPlatformLength(baseUnit * 2.5),
  jumbo: createPlatformLength(baseUnit * 3)
};

// On web, change the root font-size at specific breakpoints to scale the UI
// for larger viewports.
if (Platform.OS === 'web' && canUseDOM) {
  const { medium, large } = breakpoints;
  const htmlElement = document.documentElement;
  const setFontSize = width => {
    const fontSize = width > medium ? (width > large ? '18px' : '17px') : '16px';
    if (htmlElement) {
      htmlElement.style.fontSize = fontSize;
    }
  };

  setFontSize(Dimensions.get('window').width);
  Dimensions.addEventListener('change', dimensions => {
    setFontSize(dimensions.window.width);
  });
}
