import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { StyleSheet, View, ViewPropTypes } from 'react-native';

class AspectRatio extends PureComponent {
  static displayName = 'AspectRatio';

  static propTypes = {
    children: PropTypes.any,
    ratio: PropTypes.number,
    style: ViewPropTypes.style
  };

  static defaultProps = {
    ratio: 1
  };

  render() {
    const { children, ratio, style } = this.props;
    const percentage = 100 / ratio;

    return (
      <View style={[styles.root, style]}>
        <View style={[styles.shim, { paddingBottom: `${percentage}%` }]} />
        <View style={StyleSheet.absoluteFill}>{children}</View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden'
  },
  shim: {
    display: 'block',
    width: '100%'
  }
});

export default AspectRatio;
