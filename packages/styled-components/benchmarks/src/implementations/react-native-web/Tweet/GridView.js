import PropTypes from 'prop-types';
import { StyleSheet, View, ViewPropTypes } from 'react-native';
import React, { Component } from 'react';
import theme from './theme';

class GridView extends Component {
  static displayName = 'GridView';

  static propTypes = {
    children: PropTypes.node,
    hasGap: PropTypes.bool,
    style: ViewPropTypes.style
  };

  render() {
    const { children, hasGap, style, ...other } = this.props;

    return (
      <View {...other} style={[style, styles.root, hasGap && styles.hasGap]}>
        {React.Children.map(children, child => {
          return (
            child &&
            React.cloneElement(child, {
              style: [child.props.style, styles.column, hasGap && styles.hasGapColumn]
            })
          );
        })}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row'
  },
  /**
   * 1. Distribute all space (rather than extra space)
   * 2. Prevent wide content from forcing wider flex columns
   */
  column: {
    flexBasis: 0, // 1
    minWidth: 0 // 2
  },
  hasGap: {
    marginHorizontal: theme.createLength(theme.spaceX * -0.5, 'rem')
  },
  hasGapColumn: {
    marginHorizontal: theme.createLength(theme.spaceX * 0.5, 'rem')
  }
});

export default GridView;
