import React, { Component } from 'react';
import { Picker, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Benchmark from './Benchmark';
import Button from './Button';
import { IconClear, IconEye } from './Icons';
import Layout from './Layout';
import ReportCard from './ReportCard';
import Text from './Text';
import { colors } from './theme';

const Overlay = () => <View style={[StyleSheet.absoluteFill, { zIndex: 2 }]} />;

export default class App extends Component {
  static displayName = '@app/App';

  constructor(props, context) {
    super(props, context);
    const defaultBenchmarkName = Object.keys(props.tests)[0];
    const availableLibraries = Object.keys(props.tests[defaultBenchmarkName]);

    // Load saved picker values from localStorage
    let currentBenchmarkName = defaultBenchmarkName;
    let currentLibraryName = 'styled-components';

    try {
      const savedBenchmark = localStorage.getItem('current_benchmark');
      const savedLibrary = localStorage.getItem('current_library');

      // Only use saved values if they're still valid
      if (savedBenchmark && props.tests[savedBenchmark]) {
        currentBenchmarkName = savedBenchmark;
      }

      if (savedLibrary && props.tests[currentBenchmarkName][savedLibrary]) {
        currentLibraryName = savedLibrary;
      }
    } catch (e) {
      console.warn('Failed to load saved picker values:', e);
    }

    // Load saved results from localStorage
    let savedResults = [];
    try {
      const saved = localStorage.getItem('benchmark_results');
      if (saved) {
        savedResults = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load saved benchmark results:', e);
    }

    this.state = {
      currentBenchmarkName,
      currentLibraryName,
      status: 'idle',
      results: savedResults,
      concurrentMode: !!localStorage.getItem('concurrent_mode'),
    };
  }

  render() {
    const { tests } = this.props;
    const { currentBenchmarkName, status, currentLibraryName, results, concurrentMode } =
      this.state;
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
              <View style={{ width: 1, backgroundColor: colors.fadedGray }} />
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerTitle}>React Mode</Text>
                <Text style={{ fontWeight: 'bold' }}>
                  {concurrentMode ? 'Concurrent' : 'Legacy'}
                </Text>
                <Picker
                  enabled={status !== 'running'}
                  onValueChange={this._handleConcurrentModeChange}
                  selectedValue={concurrentMode ? 'concurrent' : 'legacy'}
                  style={styles.picker}
                  testID="concurrent-mode-picker"
                >
                  <Picker.Item key="legacy" label="Legacy" value="legacy" />
                  <Picker.Item key="concurrent" label="Concurrent" value="concurrent" />
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
                    reactMode={r.reactMode}
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

    // Save current benchmark to localStorage
    try {
      localStorage.setItem('current_benchmark', value);
    } catch (e) {
      console.warn('Failed to save current benchmark:', e);
    }
  };

  _handleChangeLibrary = value => {
    this.setState(() => ({ currentLibraryName: value }));

    // Save current library to localStorage
    try {
      localStorage.setItem('current_library', value);
    } catch (e) {
      console.warn('Failed to save current library:', e);
    }
  };

  _handleConcurrentModeChange = value => {
    const concurrentMode = value === 'concurrent';
    this.setState(() => ({ concurrentMode }));

    // Update localStorage
    if (concurrentMode) {
      localStorage.setItem('concurrent_mode', 'true');
    } else {
      localStorage.removeItem('concurrent_mode');
    }

    // Reload the page to apply the new React mode
    window.location.reload();
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

  _createHandleComplete =
    ({ benchmarkName, libraryName, sampleCount }) =>
    results => {
      this.setState(state => {
        const newResults = state.results.concat([
          {
            ...results,
            benchmarkName,
            libraryName,
            libraryVersion: this.props.tests[benchmarkName][libraryName].version,
            sampleCount,
            reactMode: this.state.concurrentMode ? 'concurrent' : 'legacy',
          },
        ]);

        // Save results to localStorage
        try {
          localStorage.setItem('benchmark_results', JSON.stringify(newResults));
        } catch (e) {
          console.warn('Failed to save benchmark results:', e);
        }

        return {
          results: newResults,
          status: 'complete',
        };
      }, this._scrollToEnd);

      // Force garbage collection after each benchmark run for clean slate
      this._forceGarbageCollection();

      // console.log(results);
      // console.log(results.samples.map(sample => sample.elapsed.toFixed(1)).join('\n'));
    };

  _handleClear = () => {
    this.setState(() => ({ results: [] }));

    // Clear only saved results from localStorage (keep picker values)
    try {
      localStorage.removeItem('benchmark_results');
    } catch (e) {
      console.warn('Failed to clear saved benchmark results:', e);
    }

    // Force garbage collection
    this._forceGarbageCollection();
  };

  _forceGarbageCollection = () => {
    // Primary method: Use exposed GC if available (Chrome with --expose-gc flag)
    if (window.gc) {
      window.gc();
      return;
    }

    // Fallback strategies to encourage garbage collection
    try {
      // Strategy 1: Create memory pressure to encourage GC
      const memoryPressure = new Array(1000000).fill(null);
      memoryPressure.length = 0;

      // Strategy 2: Use performance API if available (experimental)
      if (performance.measureUserAgentSpecificMemory) {
        performance.measureUserAgentSpecificMemory().catch(() => {
          // Ignore errors - this is experimental
        });
      }

      // Strategy 3: Allow event loop to process cleanup with setTimeout
      setTimeout(() => {
        // Give the browser a chance to clean up
        if (window.requestIdleCallback) {
          window.requestIdleCallback(() => {
            // Idle callback to encourage cleanup during idle time
          });
        }
      }, 0);
    } catch (e) {
      // Fallback strategies might fail in some browsers, ignore errors
      console.warn('Fallback garbage collection strategies failed:', e);
    }
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
