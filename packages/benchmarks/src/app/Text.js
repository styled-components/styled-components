import { bool } from 'prop-types';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { font } from './constants';

class AppText extends React.Component {
  static displayName = '@app/Text';

  static contextTypes = {
    isInAParentText: bool,
  };

  render() {
    const { style, ...rest } = this.props;
    const { isInAParentText } = this.context;
    return <Text {...rest} style={[!isInAParentText && styles.baseText, style]} />;
  }
}

const styles = StyleSheet.create({
  baseText: {
    color: 'var(--bench-text)',
    fontFamily: font,
    fontSize: 13,
    lineHeight: '1.4',
  },
});

export default AppText;
