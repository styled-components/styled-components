import PropTypes from 'prop-types';
import theme from './theme';
import React, { PureComponent } from 'react';
import { StyleSheet, Text } from 'react-native';

class AppText extends PureComponent {
  static displayName = 'AppText';

  static propTypes = {
    align: PropTypes.oneOf(['center', 'left', 'right']),
    color: PropTypes.oneOf(['blue', 'deepGray', 'normal', 'red', 'white']),
    fontStyle: PropTypes.oneOf(['normal', 'italic']),
    size: PropTypes.oneOf(['small', 'normal', 'large']),
    uppercase: PropTypes.bool,
    weight: PropTypes.oneOf(['normal', 'bold'])
  };

  render() {
    const { align, color, fontStyle, size, uppercase, weight, ...other } = this.props;

    const style = [
      styles.root,
      align && alignStyles[align],
      color && colorStyles[color],
      fontStyle && fontStyles[fontStyle],
      size && sizeStyles[size],
      weight && weightStyles[weight],
      uppercase === true && styles.uppercase
    ];

    return <Text {...other} style={style} />;
  }
}

const styles = StyleSheet.create({
  root: {
    fontFamily: theme.fontFamily,
    fontSize: theme.fontSize.normal,
    fontWeight: 'normal',
    lineHeight: theme.createLength(theme.lineHeight),
    wordWrap: 'break-word'
  },
  uppercase: {
    textTransform: 'uppercase'
  }
});

const alignStyles = StyleSheet.create({
  center: {
    textAlign: 'center'
  },
  left: {
    textAlign: 'left'
  },
  right: {
    textAlign: 'right'
  }
});

const colorStyles = StyleSheet.create({
  blue: {
    color: theme.colors.blue
  },
  deepGray: {
    color: theme.colors.deepGray
  },
  normal: {
    color: theme.colors.textBlack
  },
  red: {
    color: theme.colors.red
  },
  white: {
    color: theme.colors.white
  }
});

const fontStyles = StyleSheet.create({
  normal: {
    fontStyle: 'normal'
  },
  italic: {
    fontStyle: 'italic'
  }
});

const sizeStyles = StyleSheet.create({
  small: {
    fontSize: theme.fontSize.small
  },
  normal: {
    fontSize: theme.fontSize.normal
  },
  large: {
    fontSize: theme.fontSize.large
  }
});

const weightStyles = StyleSheet.create({
  normal: {
    fontWeight: '400'
  },
  bold: {
    fontWeight: 'bold'
  }
});

export default AppText;
