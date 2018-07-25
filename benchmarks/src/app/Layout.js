import { colors } from './theme';
import { element } from 'prop-types';
import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';

export default class Layout extends Component {
  static propTypes = {
    actionPanel: element,
    listPanel: element,
    viewPanel: element
  };

  state = {
    widescreen: false
  };

  render() {
    const { viewPanel, actionPanel, listPanel } = this.props;
    const { widescreen } = this.state;
    return (
      <View onLayout={this._handleLayout} style={[styles.root, widescreen && styles.row]}>
        <View style={[widescreen ? styles.grow : styles.stackPanel, styles.layer]}>
          {viewPanel}
        </View>
        <View style={styles.grow}>
          <View style={[styles.grow, styles.layer]}>{listPanel}</View>
          <View style={styles.divider} />
          <View style={styles.layer}>{actionPanel}</View>
        </View>
      </View>
    );
  }

  _handleLayout = ({ nativeEvent }) => {
    const { layout } = nativeEvent;
    const { width } = layout;
    if (width >= 740) {
      this.setState(() => ({ widescreen: true }));
    } else {
      this.setState(() => ({ widescreen: false }));
    }
  };
}

const styles = StyleSheet.create({
  root: {
    height: '100%'
  },
  row: {
    flexDirection: 'row'
  },
  divider: {
    height: 10,
    backgroundColor: colors.fadedGray,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: colors.mediumGray
  },
  grow: {
    flex: 1
  },
  stackPanel: {
    height: '33.33%'
  },
  layer: {
    transform: [{ translateZ: '0' }]
  }
});
