/* eslint-disable react/prop-types */
import Text from './Text';
import { StyleSheet, View } from 'react-native';
import React, { Fragment } from 'react';

const fmt = (time: number) => {
  const i = Number(Math.round(time + 'e2') + 'e-2').toFixed(2);
  return 10 / i > 1 ? `0${i}` : i;
};

class ReportCard extends React.PureComponent {
  render() {
    const {
      benchmarkName,
      libraryName,
      sampleCount,
      mean,
      meanLayout,
      meanScripting,
      stdDev,
      libraryVersion
    } = this.props;

    const sampleCountText = sampleCount != null ? `(${sampleCount})` : '';

    return (
      <View style={styles.root}>
        <View style={styles.left}>
          <Text numberOfLines={1} style={styles.bold}>
            {`${libraryName}${libraryVersion ? '@' + libraryVersion : ''}`}
          </Text>
          <Text numberOfLines={1}>
            {benchmarkName} {sampleCountText}
          </Text>
        </View>
        <View style={styles.right}>
          {mean ? (
            <View testID={benchmarkName + ' results'}>
              <Text style={[styles.bold, styles.monoFont]}>
                {fmt(mean)} ±{fmt(stdDev)} ms
              </Text>
              <Text style={[styles.smallText, styles.monoFont]}>
                (S/L) {fmt(meanScripting)}/{fmt(meanLayout)} ms
              </Text>
            </View>
          ) : (
            <Text style={styles.bold}>In progress…</Text>
          )}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  bold: {
    fontWeight: 'bold'
  },
  smallText: { fontSize: 12 },
  monoFont: {
    fontFamily: 'monospace'
  },
  centerText: {
    display: 'flex',
    alignItems: 'center'
  },
  left: {
    width: '50%'
  },
  right: {
    flex: 1,
    alignItems: 'flex-end'
  }
});

export default ReportCard;
