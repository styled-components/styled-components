import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';

export default class Layout extends Component {
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
        <View style={[styles.grow, styles.controlSide]}>
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
    height: '100%',
    backgroundColor: 'var(--bench-bg)',
  },
  row: {
    flexDirection: 'row'
  },
  controlSide: {
    backgroundColor: 'var(--bench-surface)',
  },
  divider: {
    height: 1,
    backgroundColor: 'var(--bench-border)',
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
