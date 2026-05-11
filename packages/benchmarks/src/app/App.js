import React, { Component } from 'react';
import { Picker, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Benchmark from './Benchmark';
import Button from './Button';
import { IconClear, IconEye } from './Icons';
import Layout from './Layout';
import ReportCard from './ReportCard';
import Text from './Text';
import { font } from './constants';

const Overlay = () => <View style={[StyleSheet.absoluteFill, { zIndex: 2 }]} />;

const Chevron = () => (
  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0 }}>
    <path d="M1 1l4 4 4-4" stroke="var(--bench-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const STORAGE_KEY = 'sc-bench-settings';

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveSettings(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentBenchmarkName: state.currentBenchmarkName,
      currentLibraryName: state.currentLibraryName,
      sortBy: state.sortBy,
      groupByBenchmark: state.groupByBenchmark,
      autoSelectedLibraries: state.autoSelectedLibraries,
      autoSelectedBenchmarks: state.autoSelectedBenchmarks,
    }));
  } catch (e) {
    // ignore
  }
}

export default class App extends Component {
  static displayName = '@app/App';

  constructor(props, context) {
    super(props, context);
    const saved = loadSettings();
    const benchmarkNames = Object.keys(props.tests);
    const currentBenchmarkName = benchmarkNames.includes(saved.currentBenchmarkName)
      ? saved.currentBenchmarkName
      : benchmarkNames[0];
    const libraryNames = Object.keys(props.tests[currentBenchmarkName]);
    const currentLibraryName = libraryNames.includes(saved.currentLibraryName)
      ? saved.currentLibraryName
      : 'styled-components';
    const allLibraries = Object.keys(props.tests[currentBenchmarkName]);
    const allBenchmarks = Object.keys(props.tests);
    const allChecked = items =>
      items.reduce((acc, k) => {
        acc[k] = true;
        return acc;
      }, {});
    this.state = {
      currentBenchmarkName,
      currentLibraryName,
      status: 'idle',
      results: [],
      autoQueue: null,
      // null | 'benchmark' | 'suite'
      dialogMode: null,
      autoSelectedLibraries:
        saved.autoSelectedLibraries && Object.keys(saved.autoSelectedLibraries).length
          ? saved.autoSelectedLibraries
          : allChecked(allLibraries),
      autoSelectedBenchmarks:
        saved.autoSelectedBenchmarks && Object.keys(saved.autoSelectedBenchmarks).length
          ? saved.autoSelectedBenchmarks
          : allChecked(allBenchmarks),
      sortBy: saved.sortBy || 'none',
      groupByBenchmark: saved.groupByBenchmark || false,
    };
  }

  render() {
    const { tests } = this.props;
    const { currentBenchmarkName, status, currentLibraryName, results, autoQueue, dialogMode } = this.state;
    const currentImplementation = tests[currentBenchmarkName][currentLibraryName];
    const { Component, Provider, getComponentProps, sampleCount } = currentImplementation;
    const isRunning = status === 'running';
    const isAutoRunning = isRunning && autoQueue !== null;

    return (
      <React.Fragment>
      <Layout
        actionPanel={
          <div style={actionStyles.root}>
            <div style={actionStyles.pickers}>
              <div style={actionStyles.pickerGroup}>
                <div style={actionStyles.pickerLabel}>Library</div>
                <div data-bench-picker="" style={actionStyles.pickerSelect}>
                  <div style={actionStyles.pickerValue}>{currentLibraryName}</div>
                  <Chevron />
                  <Picker
                    enabled={!isRunning}
                    onValueChange={this._handleChangeLibrary}
                    selectedValue={currentLibraryName}
                    style={pickerOverlayStyle}
                  >
                    {Object.keys(tests[currentBenchmarkName]).map(libraryName => (
                      <Picker.Item key={libraryName} label={libraryName} value={libraryName} />
                    ))}
                  </Picker>
                </div>
              </div>
              <div style={actionStyles.pickerGroup}>
                <div style={actionStyles.pickerLabel}>Benchmark</div>
                <div data-bench-picker="" style={actionStyles.pickerSelect}>
                  <div style={actionStyles.pickerValue}>{currentBenchmarkName}</div>
                  <Chevron />
                  <Picker
                    enabled={!isRunning}
                    onValueChange={this._handleChangeBenchmark}
                    selectedValue={currentBenchmarkName}
                    style={pickerOverlayStyle}
                    testID="benchmark-picker"
                  >
                    {Object.keys(tests).map(test => (
                      <Picker.Item key={test} label={test} value={test} />
                    ))}
                  </Picker>
                </div>
              </div>
            </div>

            <div style={actionStyles.buttons}>
              {isRunning ? (
                <Button
                  onPress={this._handleStop}
                  style={actionStyles.button}
                  variant="stop"
                  title={
                    isAutoRunning ? 'Stop (' + autoQueue.length + ' remaining)' : 'Stop'
                  }
                  testID="stop-button"
                />
              ) : (
                <React.Fragment>
                  <Button
                    onPress={this._handleStart}
                    style={actionStyles.button}
                    title="Run"
                    testID="run-button"
                  />
                  <Button
                    onPress={this._handleShowAutoBenchmarkDialog}
                    style={actionStyles.button}
                    title="Auto Benchmark"
                    testID="auto-benchmark-button"
                  />
                  <Button
                    onPress={this._handleShowAutoSuiteDialog}
                    style={actionStyles.button}
                    variant="muted"
                    title="Auto Suite"
                    testID="auto-suite-button"
                  />
                </React.Fragment>
              )}
            </div>
          </div>
        }
        listPanel={
          <View style={styles.listPanel}>
            <View style={styles.grow}>
              <div style={listBarStyles.root}>
                <div style={listBarStyles.left}>
                  <div style={listBarStyles.title}>Results</div>
                  <TouchableOpacity onPress={this._handleClear}>
                    <IconClear />
                  </TouchableOpacity>
                </div>
                <div style={listBarStyles.controls}>
                  <div
                    data-bench-btn=""
                    style={{
                      ...listBarStyles.toggle,
                      ...(this.state.groupByBenchmark ? listBarStyles.toggleActive : {}),
                    }}
                    onClick={this._handleToggleGroup}
                  >
                    Group
                  </div>
                  <div style={listBarStyles.sortWrap}>
                    <select
                      style={listBarStyles.select}
                      value={this.state.sortBy}
                      onChange={this._handleSortChange}
                    >
                      <option value="none">Insertion order</option>
                      <option value="fastest">Fastest first</option>
                      <option value="slowest">Slowest first</option>
                      <option value="name">By name</option>
                    </select>
                    <Chevron />
                  </div>
                </div>
              </div>
              <ScrollView ref={this._setScrollRef} style={styles.grow}>
                {results.length === 0 && !isRunning ? (
                  <div style={emptyStyles.root}>
                    <div style={emptyStyles.text}>No results yet. Run a benchmark to get started.</div>
                  </div>
                ) : null}
                {this._renderResults()}
                {isRunning ? (
                  <ReportCard
                    benchmarkName={currentBenchmarkName}
                    libraryName={currentLibraryName}
                  />
                ) : null}
              </ScrollView>
            </View>
            {isRunning ? <Overlay /> : null}
          </View>
        }
        viewPanel={
          <View style={styles.viewPanel}>
            <View style={styles.iconEyeContainer}>
              <TouchableOpacity onPress={this._handleVisuallyHideBenchmark}>
                <IconEye style={styles.iconEye} />
              </TouchableOpacity>
            </View>

            <Provider key={currentLibraryName + ':' + currentBenchmarkName}>
              {isRunning ? (
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
              ) : (
                <Component {...getComponentProps({ cycle: 10 })} />
              )}
            </Provider>

            {isRunning ? <Overlay /> : null}
          </View>
        }
      />
      {dialogMode ? this._renderAutoDialog() : null}
    </React.Fragment>
    );
  }

  _renderAutoDialog() {
    const { tests } = this.props;
    const { dialogMode, autoSelectedLibraries, autoSelectedBenchmarks, currentBenchmarkName } =
      this.state;
    const allBenchmarks = Object.keys(tests);
    const allLibraries = Object.keys(tests[allBenchmarks[0]]);
    const selectedLibCount = allLibraries.filter(l => autoSelectedLibraries[l]).length;
    const selectedBenchCount = allBenchmarks.filter(b => autoSelectedBenchmarks[b]).length;
    const isSuite = dialogMode === 'suite';
    const totalRuns = isSuite ? selectedBenchCount * selectedLibCount : selectedLibCount;
    const canRun = isSuite ? selectedBenchCount > 0 && selectedLibCount > 0 : selectedLibCount > 0;

    const renderCheckRow = (key, label, checked, onToggle) => (
      <div
        key={key}
        data-bench-check=""
        style={dialogStyles.checkRow}
        onClick={() => onToggle(key)}
      >
        <div
          style={{
            ...dialogStyles.checkbox,
            ...(checked ? dialogStyles.checkboxChecked : {}),
          }}
        >
          {checked ? (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path
                d="M1 4l2.5 2.5L9 1"
                stroke="#fff"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </div>
        <div style={dialogStyles.checkLabel}>{label}</div>
      </div>
    );

    const renderColumn = (title, items, selected, onToggle, onAll, onNone, withDivider) => (
      <div
        style={{
          ...dialogStyles.column,
          ...(withDivider ? dialogStyles.columnDivider : null),
        }}
      >
        <div style={dialogStyles.columnHeader}>
          <div style={dialogStyles.columnTitle}>{title}</div>
          <div style={dialogStyles.columnActions}>
            <span style={dialogStyles.columnAction} onClick={onAll}>
              All
            </span>
            <span style={dialogStyles.columnActionSep}>·</span>
            <span style={dialogStyles.columnAction} onClick={onNone}>
              None
            </span>
          </div>
        </div>
        <div style={dialogStyles.columnList}>
          {items.map(item => renderCheckRow(item, item, !!selected[item], onToggle))}
        </div>
      </div>
    );

    return (
      <div style={dialogStyles.backdrop} onClick={this._handleCancelAutoDialog}>
        <div
          style={{
            ...dialogStyles.box,
            ...(isSuite ? dialogStyles.boxWide : null),
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={dialogStyles.header}>
            <div style={dialogStyles.title}>{isSuite ? 'Auto Suite' : 'Auto Benchmark'}</div>
            <div style={dialogStyles.subtitle}>
              {isSuite
                ? 'Runs each selected benchmark on each selected library.'
                : 'Runs the "' + currentBenchmarkName + '" benchmark on each selected library.'}
            </div>
          </div>

          <div style={dialogStyles.columns}>
            {isSuite
              ? renderColumn(
                  'Benchmarks',
                  allBenchmarks,
                  autoSelectedBenchmarks,
                  this._handleToggleAutoBenchmark,
                  () => this._setAllAuto('benchmarks', true),
                  () => this._setAllAuto('benchmarks', false),
                  true
                )
              : null}
            {renderColumn(
              'Libraries',
              allLibraries,
              autoSelectedLibraries,
              this._handleToggleAutoLibrary,
              () => this._setAllAuto('libraries', true),
              () => this._setAllAuto('libraries', false),
              false
            )}
          </div>

          <div style={dialogStyles.footer}>
            <Button
              onPress={this._handleCancelAutoDialog}
              style={dialogStyles.footerBtn}
              variant="muted"
              title="Cancel"
            />
            <Button
              onPress={this._handleStartAuto}
              style={dialogStyles.footerBtn}
              title={'Run ' + totalRuns + (totalRuns === 1 ? ' run' : ' runs')}
              disabled={!canRun}
            />
          </div>
        </div>
      </div>
    );
  }

  _handleChangeBenchmark = value => {
    this.setState(
      () => ({ currentBenchmarkName: value }),
      () => saveSettings(this.state)
    );
  };

  _handleChangeLibrary = value => {
    this.setState(
      () => ({ currentLibraryName: value }),
      () => saveSettings(this.state)
    );
  };

  _handleStart = () => {
    this.setState(
      () => ({ status: 'running', autoQueue: null }),
      () => {
        if (this._shouldHideBenchmark && this._benchWrapperRef) {
          this._benchWrapperRef.setNativeProps({ style: { opacity: 0 } });
        }
        this._benchmarkRef.start();
        this._scrollToEnd();
      }
    );
  };

  _handleShowAutoBenchmarkDialog = () => {
    this.setState({ dialogMode: 'benchmark' });
  };

  _handleShowAutoSuiteDialog = () => {
    this.setState({ dialogMode: 'suite' });
  };

  _handleCancelAutoDialog = () => {
    this.setState({ dialogMode: null });
  };

  _handleToggleAutoLibrary = lib => {
    this.setState(
      state => ({
        autoSelectedLibraries: {
          ...state.autoSelectedLibraries,
          [lib]: !state.autoSelectedLibraries[lib],
        },
      }),
      () => saveSettings(this.state)
    );
  };

  _handleToggleAutoBenchmark = bench => {
    this.setState(
      state => ({
        autoSelectedBenchmarks: {
          ...state.autoSelectedBenchmarks,
          [bench]: !state.autoSelectedBenchmarks[bench],
        },
      }),
      () => saveSettings(this.state)
    );
  };

  _setAllAuto = (kind, value) => {
    const { tests } = this.props;
    if (kind === 'libraries') {
      const allLibraries = Object.keys(tests[Object.keys(tests)[0]]);
      const next = {};
      for (const lib of allLibraries) next[lib] = value;
      this.setState({ autoSelectedLibraries: next }, () => saveSettings(this.state));
    } else if (kind === 'benchmarks') {
      const allBenchmarks = Object.keys(tests);
      const next = {};
      for (const b of allBenchmarks) next[b] = value;
      this.setState({ autoSelectedBenchmarks: next }, () => saveSettings(this.state));
    }
  };

  _handleStartAuto = () => {
    const { tests } = this.props;
    const {
      dialogMode,
      autoSelectedLibraries,
      autoSelectedBenchmarks,
      currentBenchmarkName,
    } = this.state;

    const allBenchmarks = Object.keys(tests);
    const allLibraries = Object.keys(tests[allBenchmarks[0]]);
    const selectedLibraries = allLibraries.filter(lib => autoSelectedLibraries[lib]);
    if (selectedLibraries.length === 0) return;

    let benchmarks;
    if (dialogMode === 'suite') {
      benchmarks = allBenchmarks.filter(b => autoSelectedBenchmarks[b]);
      if (benchmarks.length === 0) return;
    } else {
      benchmarks = [currentBenchmarkName];
    }

    const queue = [];
    for (const benchmarkName of benchmarks) {
      for (const libraryName of selectedLibraries) {
        queue.push({ benchmarkName, libraryName });
      }
    }

    const [first, ...rest] = queue;
    this.setState({ dialogMode: null });
    this._startAutoRun(first.benchmarkName, first.libraryName, rest);
  };

  _startAutoRun(benchmarkName, libraryName, queue) {
    this.setState(
      () => ({
        currentBenchmarkName: benchmarkName,
        currentLibraryName: libraryName,
        autoQueue: queue,
        status: 'running',
      }),
      () => {
        if (this._shouldHideBenchmark && this._benchWrapperRef) {
          this._benchWrapperRef.setNativeProps({ style: { opacity: 0 } });
        }
        this._benchmarkRef.start();
        this._scrollToEnd();
      }
    );
  }

  _handleStop = () => {
    if (this._benchmarkRef && typeof this._benchmarkRef.stop === 'function') {
      this._benchmarkRef.stop();
    }
    clearTimeout(this._waitTimer);
    this.setState({ status: 'idle', autoQueue: null });
  };

  _waitForRefAndStart(attempts = 0) {
    if (this._unmounted) return;
    if (this._benchmarkRef) {
      this._benchmarkRef.start();
      return;
    }
    if (attempts < 20) {
      this._waitTimer = setTimeout(() => this._waitForRefAndStart(attempts + 1), 50);
    }
  }

  componentWillUnmount() {
    this._unmounted = true;
    clearTimeout(this._waitTimer);
  }

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
      this.setState(
        state => {
          const newResults = state.results.concat([
            {
              ...results,
              benchmarkName,
              libraryName,
              libraryVersion: this.props.tests[benchmarkName][libraryName].version,
            },
          ]);

          if (state.autoQueue && state.autoQueue.length > 0) {
            const [next, ...rest] = state.autoQueue;
            return {
              results: newResults,
              currentBenchmarkName: next.benchmarkName,
              currentLibraryName: next.libraryName,
              autoQueue: rest,
              status: 'running',
            };
          }

          return {
            results: newResults,
            autoQueue: null,
            status: 'complete',
          };
        },
        () => {
          this._scrollToEnd();
          if (this.state.status === 'running') {
            this._waitForRefAndStart();
          }
        }
      );
    };

  _handleClear = () => {
    this.setState(() => ({ results: [] }));
  };

  _handleSortChange = e => {
    this.setState(
      { sortBy: e.target.value },
      () => saveSettings(this.state)
    );
  };

  _handleToggleGroup = () => {
    this.setState(
      state => ({ groupByBenchmark: !state.groupByBenchmark }),
      () => saveSettings(this.state)
    );
  };

  _sortResults(list) {
    const { sortBy } = this.state;
    if (sortBy === 'none') return list;
    const sorted = list.slice();
    switch (sortBy) {
      case 'fastest':
        sorted.sort((a, b) => a.mean - b.mean);
        break;
      case 'slowest':
        sorted.sort((a, b) => b.mean - a.mean);
        break;
      case 'name':
        sorted.sort((a, b) => a.libraryName.localeCompare(b.libraryName));
        break;
    }
    return sorted;
  }

  _renderCard(r, key, hideBenchmarkName) {
    return (
      <ReportCard
        benchmarkName={r.benchmarkName}
        key={key}
        libraryName={r.libraryName}
        libraryVersion={r.libraryVersion}
        mean={r.mean}
        meanLayout={r.meanLayout}
        meanScripting={r.meanScripting}
        runTime={r.runTime}
        sampleCount={r.sampleCount}
        stdDev={r.stdDev}
        hideBenchmarkName={hideBenchmarkName}
      />
    );
  }

  _renderResults() {
    const { results, groupByBenchmark } = this.state;
    if (results.length === 0) return null;

    if (!groupByBenchmark) {
      return this._sortResults(results).map((r, i) => this._renderCard(r, 'r' + i));
    }

    const groupOrder = [];
    const groups = {};
    for (const r of results) {
      if (!groups[r.benchmarkName]) {
        groups[r.benchmarkName] = [];
        groupOrder.push(r.benchmarkName);
      }
      groups[r.benchmarkName].push(r);
    }

    const elements = [];
    for (const name of groupOrder) {
      elements.push(
        <div key={'g' + name} style={groupHeaderStyles.root}>
          <div style={groupHeaderStyles.text}>{name}</div>
        </div>
      );
      const sorted = this._sortResults(groups[name]);
      for (let i = 0; i < sorted.length; i++) {
        elements.push(this._renderCard(sorted[i], 'r' + name + i, true));
      }
    }
    return elements;
  }

  _setBenchRef = ref => {
    this._benchmarkRef = ref;
  };

  _setBenchWrapperRef = ref => {
    this._benchWrapperRef = ref;
  };

  _setScrollRef = ref => {
    this._scrollRef = ref;
  };

  _scrollToEnd = () => {
    window.requestAnimationFrame(() => {
      if (this._scrollRef) {
        this._scrollRef.scrollToEnd();
      }
    });
  };
}

// RNW styles (for View/ScrollView components)
const styles = StyleSheet.create({
  viewPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'var(--bench-view-bg)',
  },
  iconEye: {
    color: 'rgba(255,255,255,0.7)',
    height: 28,
  },
  iconEyeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  grow: {
    flex: 1,
  },
  listPanel: {
    flex: 1,
    width: '100%',
  },
});

const actionStyles = {
  root: {
    padding: 12,
    borderTop: '1px solid var(--bench-border)',
    backgroundColor: 'var(--bench-surface)',
  },
  pickers: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  pickerGroup: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 10,
    fontWeight: 600,
    fontFamily: font,
    color: 'var(--bench-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4,
  },
  pickerSelect: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    border: '1px solid var(--bench-border)',
    borderRadius: 6,
    padding: '7px 10px',
    backgroundColor: 'var(--bench-surface-alt)',
    cursor: 'pointer',
    transition: 'border-color 0.12s',
  },
  pickerValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: 500,
    fontFamily: font,
    color: 'var(--bench-text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    minWidth: 0,
  },
  buttons: {
    display: 'flex',
    flexDirection: 'row',
    gap: 6,
  },
  button: {
    flex: 1,
  },
};

const pickerOverlayStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100%',
  opacity: 0,
  cursor: 'pointer',
};

const listBarStyles = {
  root: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 10px',
    borderBottom: '1px solid var(--bench-border)',
    gap: 8,
  },
  left: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    color: 'var(--bench-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  controls: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggle: {
    fontSize: 11,
    fontWeight: 500,
    fontFamily: font,
    color: 'var(--bench-text-muted)',
    padding: '3px 8px',
    borderRadius: 4,
    border: '1px solid var(--bench-border)',
    cursor: 'pointer',
    transition: 'all 0.12s',
    userSelect: 'none',
  },
  toggleActive: {
    color: 'var(--bench-accent)',
    borderColor: 'var(--bench-accent)',
    backgroundColor: 'var(--bench-accent-light)',
  },
  sortWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    border: '1px solid var(--bench-border)',
    borderRadius: 4,
    padding: '3px 8px',
    backgroundColor: 'var(--bench-surface)',
  },
  select: {
    appearance: 'none',
    border: 'none',
    background: 'none',
    fontSize: 11,
    fontWeight: 500,
    fontFamily: font,
    color: 'var(--bench-text-secondary)',
    cursor: 'pointer',
    outline: 'none',
    padding: 0,
  },
};

const groupHeaderStyles = {
  root: {
    padding: '8px 14px 4px',
    backgroundColor: 'var(--bench-surface-alt)',
    borderBottom: '1px solid var(--bench-border)',
  },
  text: {
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    color: 'var(--bench-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
};

const emptyStyles = {
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  },
  text: {
    fontSize: 13,
    fontFamily: font,
    color: 'var(--bench-text-muted)',
  },
};

const dialogStyles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--bench-backdrop)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  box: {
    backgroundColor: 'var(--bench-surface)',
    borderRadius: 12,
    width: 340,
    maxHeight: '80%',
    boxShadow: 'var(--bench-dialog-shadow)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  boxWide: {
    width: 560,
  },
  columns: {
    display: 'flex',
    flexDirection: 'row',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  column: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
  },
  columnDivider: {
    borderRight: '1px solid var(--bench-border)',
  },
  columnHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px 6px',
    borderBottom: '1px solid var(--bench-border)',
  },
  columnTitle: {
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    color: 'var(--bench-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  columnActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  columnAction: {
    fontSize: 11,
    fontFamily: font,
    color: 'var(--bench-accent)',
    cursor: 'pointer',
    userSelect: 'none',
  },
  columnActionSep: {
    fontSize: 11,
    color: 'var(--bench-text-muted)',
    userSelect: 'none',
  },
  columnList: {
    padding: '8px 0',
    overflow: 'auto',
    flex: 1,
  },
  header: {
    padding: '20px 20px 12px',
    borderBottom: '1px solid var(--bench-border)',
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    fontFamily: font,
    color: 'var(--bench-text)',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: font,
    color: 'var(--bench-text-muted)',
    lineHeight: '1.4',
  },
  list: {
    padding: '8px 0',
    maxHeight: 300,
    overflow: 'auto',
  },
  checkRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: '8px 20px',
    cursor: 'pointer',
    transition: 'background-color 0.1s',
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    border: '2px solid var(--bench-checkbox-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
    transition: 'all 0.1s',
  },
  checkboxChecked: {
    backgroundColor: 'var(--bench-accent)',
    borderColor: 'var(--bench-accent)',
  },
  checkLabel: {
    fontSize: 13,
    fontFamily: font,
    color: 'var(--bench-text)',
  },
  footer: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
    padding: '12px 20px 16px',
    borderTop: '1px solid var(--bench-border)',
  },
  footerBtn: {
    flex: 1,
  },
};
