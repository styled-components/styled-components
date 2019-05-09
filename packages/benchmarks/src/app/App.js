/* eslint-disable */

import { Picker, StyleSheet, ScrollView, TouchableOpacity, View } from 'react-native';
import React, { Component } from 'react';
import Benchmark from './Benchmark';
import Button from './Button';
import { IconClear, IconEye } from './Icons';
import ReportCard from './ReportCard';
import Text from './Text';
import Layout from './Layout';
import { colors } from './theme';

const Overlay = () => <View style={[StyleSheet.absoluteFill, { zIndex: 2 }]} />;

export default class App extends Component {
  static displayName = '@app/App';

  constructor(props, context) {
    super(props, context);
    const currentBenchmarkName = Object.keys(props.tests)[0];
    this.state = {
      currentBenchmarkName,
      currentLibraryName: 'styled-components',
      status: 'idle',
      results: [],
    };
  }

  render() {
    const { tests } = this.props;
    const { currentBenchmarkName, status, currentLibraryName, results } = this.state;
    const currentImplementation = tests[currentBenchmarkName][currentLibraryName];
    const { Component, Provider, getComponentProps, sampleCount } = currentImplementation;

    return (
      <Layout
        actionPanel={
          <View>
            <View style={styles.pickers}>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerTitle}>Library</Text>
                <Text style={{ fontWeight: 'bold' }}>{currentLibraryName}</Text>

                <Picker
                  enabled={status !== 'running'}
                  onValueChange={this._handleChangeLibrary}
                  selectedValue={currentLibraryName}
                  style={styles.picker}
                >
                  {Object.keys(tests[currentBenchmarkName]).map(libraryName => (
                    <Picker.Item key={libraryName} label={libraryName} value={libraryName} />
                  ))}
                </Picker>
              </View>
              <View style={{ width: 1, backgroundColor: colors.fadedGray }} />
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerTitle}>Benchmark</Text>
                <Text testID="current-benchmark-name">{currentBenchmarkName}</Text>
                <Picker
                  enabled={status !== 'running'}
                  onValueChange={this._handleChangeBenchmark}
                  selectedValue={currentBenchmarkName}
                  style={styles.picker}
                  testID="benchmark-picker"
                >
                  {Object.keys(tests).map(test => (
                    <Picker.Item key={test} label={test} value={test} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={{ flexDirection: 'row', height: 50 }}>
              <View style={styles.grow}>
                <Button
                  onPress={this._handleStart}
                  style={styles.button}
                  title={status === 'running' ? 'Running…' : 'Run'}
                  disabled={status === 'running'}
                  testID="run-button"
                />
              </View>
            </View>

            {status === 'running' ? <Overlay /> : null}
          </View>
        }
        listPanel={
          <View style={styles.listPanel}>
            <View style={styles.grow}>
              <View style={styles.listBar}>
                <View style={styles.iconClearContainer}>
                  <TouchableOpacity onPress={this._handleClear}>
                    <IconClear />
                  </TouchableOpacity>
                </View>
              </View>
              <ScrollView ref={this._setScrollRef} style={styles.grow}>
                {results.map((r, i) => (
                  <ReportCard
                    benchmarkName={r.benchmarkName}
                    key={i}
                    libraryName={r.libraryName}
                    libraryVersion={r.libraryVersion}
                    mean={r.mean}
                    meanLayout={r.meanLayout}
                    meanScripting={r.meanScripting}
                    runTime={r.runTime}
                    sampleCount={r.sampleCount}
                    stdDev={r.stdDev}
                  />
                ))}
                {status === 'running' ? (
                  <ReportCard
                    benchmarkName={currentBenchmarkName}
                    libraryName={currentLibraryName}
                  />
                ) : null}
              </ScrollView>
            </View>
            {status === 'running' ? <Overlay /> : null}
          </View>
        }
        viewPanel={
          <View style={styles.viewPanel}>
            <View style={styles.iconEyeContainer}>
              <TouchableOpacity onPress={this._handleVisuallyHideBenchmark}>
                <IconEye style={styles.iconEye} />
              </TouchableOpacity>
            </View>

            <Provider>
              {status === 'running' ? (
                <React.Fragment>
                  <View ref={this._setBenchWrapperRef}>
                    <Benchmark
                      component={Component}
                      forceLayout
                      getComponentProps={getComponentProps}
                      onComplete={this._createHandleComplete({
                        sampleCount,
                        benchmarkName: currentBenchmarkName,
                        libraryName: currentLibraryName,
                      })}
                      ref={this._setBenchRef}
                      sampleCount={sampleCount}
                      timeout={20000}
                      type={Component.benchmarkType}
                    />
                  </View>
                </React.Fragment>
              ) : (
                <Component {...getComponentProps({ cycle: 10 })} />
              )}
            </Provider>

            {status === 'running' ? <Overlay /> : null}
          </View>
        }
      />
    );
  }

  _handleChangeBenchmark = value => {
    this.setState(() => ({ currentBenchmarkName: value }));
  };

  _handleChangeLibrary = value => {
    this.setState(() => ({ currentLibraryName: value }));
  };

  _handleStart = () => {
    this.setState(
      () => ({ status: 'running' }),
      () => {
        if (this._shouldHideBenchmark && this._benchWrapperRef) {
          this._benchWrapperRef.setNativeProps({ style: { opacity: 0 } });
        }
        this._benchmarkRef.start();
        this._scrollToEnd();
      }
    );
  };

  // hide the benchmark as it is performed (no flashing on screen)
  _handleVisuallyHideBenchmark = () => {
    this._shouldHideBenchmark = !this._shouldHideBenchmark;
    if (this._benchWrapperRef) {
      this._benchWrapperRef.setNativeProps({
        style: { opacity: this._shouldHideBenchmark ? 0 : 1 },
      });
    }
  };

  _createHandleComplete = ({ benchmarkName, libraryName, sampleCount }) => results => {
    this.setState(
      state => ({
        results: state.results.concat([
          {
            ...results,
            benchmarkName,
            libraryName,
            libraryVersion: this.props.tests[benchmarkName][libraryName].version,
          },
        ]),
        status: 'complete',
      }),
      this._scrollToEnd
    );
    // console.log(results);
    // console.log(results.samples.map(sample => sample.elapsed.toFixed(1)).join('\n'));
  };

  _handleClear = () => {
    this.setState(() => ({ results: [] }));
  };

  _setBenchRef = ref => {
    this._benchmarkRef = ref;
  };

  _setBenchWrapperRef = ref => {
    this._benchWrapperRef = ref;
  };

  _setScrollRef = ref => {
    this._scrollRef = ref;
  };

  // scroll the most recent result into view
  _scrollToEnd = () => {
    window.requestAnimationFrame(() => {
      if (this._scrollRef) {
        this._scrollRef.scrollToEnd();
      }
    });
  };
}

const styles = StyleSheet.create({
  viewPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'black',
  },
  iconEye: {
    color: 'white',
    height: 32,
  },
  iconEyeContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  iconClearContainer: {
    height: '100%',
    marginLeft: 5,
  },
  grow: {
    flex: 1,
  },
  listPanel: {
    flex: 1,
    width: '100%',
    marginHorizontal: 'auto',
  },
  listBar: {
    padding: 5,
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: colors.fadedGray,
    borderBottomWidth: 1,
    borderBottomColor: colors.mediumGray,
    justifyContent: 'flex-end',
  },
  pickers: {
    flexDirection: 'row',
  },
  pickerContainer: {
    flex: 1,
    padding: 5,
  },
  pickerTitle: {
    fontSize: 12,
    color: colors.deepGray,
  },
  picker: {
    ...StyleSheet.absoluteFillObject,
    appearance: 'none',
    opacity: 0,
    width: '100%',
  },
  button: {
    borderRadius: 0,
    flex: 1,
  },
});
