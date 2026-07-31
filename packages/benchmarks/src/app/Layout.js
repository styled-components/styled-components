import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';

export default class Layout extends Component {
  state = {
    widescreen: false,
    rootHeight: 0,
  };

  render() {
    const { viewPanel, actionPanel, listPanel } = this.props;
    const { widescreen, rootHeight } = this.state;
    // Stacked (narrow) mode: cap the results list at a quarter of the root so
    // the case view keeps the rest.
    const narrowList = !widescreen && rootHeight > 0 ? { height: rootHeight / 4 } : null;
    return (
      <View onLayout={this._handleLayout} style={[styles.root, widescreen && styles.row]}>
        <View style={[styles.grow, styles.layer]}>{viewPanel}</View>
        <View style={[widescreen && styles.grow, styles.controlSide]}>
          <View style={[widescreen ? styles.grow : narrowList, styles.layer]}>{listPanel}</View>
          <View style={styles.divider} />
          <View style={styles.layer}>{actionPanel}</View>
        </View>
      </View>
    );
  }

  _handleLayout = ({ nativeEvent }) => {
    const { layout } = nativeEvent;
    const { width, height } = layout;
    const widescreen = width >= 740;
    if (widescreen !== this.state.widescreen || height !== this.state.rootHeight) {
      this.setState(() => ({ widescreen, rootHeight: height }));
    }
  };
}

const styles = StyleSheet.create({
  root: {
    height: '100%',
    backgroundColor: 'var(--bench-bg)',
  },
  row: {
    flexDirection: 'row',
  },
  controlSide: {
    backgroundColor: 'var(--bench-surface)',
  },
  divider: {
    height: 1,
    backgroundColor: 'var(--bench-border)',
  },
  grow: {
    flex: 1,
  },
  layer: {
    transform: [{ translateZ: '0' }],
  },
});
