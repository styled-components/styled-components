import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Benchmark, { type BenchmarkResult, forceGc, startProfile, stopProfile } from './Benchmark';
import implementations, { type Implementation } from '../impl';
import tests, { type BenchCase } from '../tests';

const RECEIVER_URL = 'http://127.0.0.1:9999';
const HEALTH_TIMEOUT_MS = 1500;

interface Result {
  caseName: string;
  implName: string;
  result: BenchmarkResult;
  ts: number;
}

interface Job {
  caseName: string;
  impl: Implementation;
}

interface State {
  selectedCase: string;
  selectedImpl: string;
  status: 'idle' | 'running' | 'cooldown';
  results: Result[];
  queue: Job[];
  autoMode: 'pending' | 'on' | 'off';
}

const COOLDOWN_MS = 250;

const checkReceiverHealth = async (): Promise<boolean> => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch(`${RECEIVER_URL}/health`, { signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
};

interface RunConfig {
  tag: string;
  libs: string[]; // empty = all libs
  cases?: string[]; // when set, only run these cases; empty = all
  profile?: boolean; // when true, sample-profile each (matching) case
  profileCases?: string[]; // when set, only profile these cases; empty = all
}

const fetchRunConfig = async (): Promise<RunConfig> => {
  try {
    const res = await fetch(`${RECEIVER_URL}/run-config`);
    if (!res.ok) return { tag: 'combined', libs: [] };
    return (await res.json()) as RunConfig;
  } catch {
    return { tag: 'combined', libs: [] };
  }
};

const postReceiver = async (path: string, body: unknown): Promise<void> => {
  try {
    await fetch(`${RECEIVER_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.warn(`receiver POST ${path} failed`, err);
  }
};

export default class App extends React.Component<{}, State> {
  private benchRef = React.createRef<Benchmark>();
  private cooldownTimer: ReturnType<typeof setTimeout> | null = null;

  private runConfig: RunConfig = { tag: 'combined', libs: [] };

  state: State = {
    selectedCase: Object.keys(tests)[0],
    selectedImpl: implementations[0].name,
    status: 'idle',
    results: [],
    queue: [],
    autoMode: 'pending',
  };

  async componentDidMount() {
    const reachable = await checkReceiverHealth();
    if (reachable) {
      this.runConfig = await fetchRunConfig();
      this.setState({ autoMode: 'on' }, () => this.handleRunAll());
    } else {
      this.setState({ autoMode: 'off' });
    }
  }

  componentWillUnmount() {
    if (this.cooldownTimer) clearTimeout(this.cooldownTimer);
  }

  private profilingActive = false;

  private shouldProfileCase = (caseName: string): boolean => {
    if (!this.runConfig.profile) return false;
    const list = this.runConfig.profileCases ?? [];
    return list.length === 0 || list.includes(caseName);
  };

  private runJob = (job: Job) => {
    // Force a major GC right before each case starts, so the run's first
    // samples don't hit a deferred collection from the previous case's
    // teardown. Real GC pauses during sampling are still possible, but
    // their probability drops sharply with the heap freshly compacted.
    forceGc();
    if (this.shouldProfileCase(job.caseName)) {
      this.profilingActive = startProfile();
    } else {
      this.profilingActive = false;
    }
    this.setState({ status: 'running' }, () => {
      requestAnimationFrame(() => this.benchRef.current?.start());
    });
  };

  private handleRunOne = () => {
    const impl = implementations.find((i) => i.name === this.state.selectedImpl);
    if (!impl) return;
    this.runJob({ caseName: this.state.selectedCase, impl });
  };

  private handleRunAll = () => {
    const allowedLibs = this.runConfig.libs;
    const filteredImpls = allowedLibs.length === 0
      ? implementations
      : implementations.filter((i) => allowedLibs.includes(i.name));

    const allowedCases = this.runConfig.cases ?? [];
    const filteredCases = allowedCases.length === 0
      ? Object.keys(tests)
      : Object.keys(tests).filter((c) => allowedCases.includes(c));

    const jobs: Job[] = [];
    for (const caseName of filteredCases) {
      for (const impl of filteredImpls) {
        jobs.push({ caseName, impl });
      }
    }
    if (jobs.length === 0) return;
    this.setState({ queue: jobs.slice(1), selectedCase: jobs[0].caseName, selectedImpl: jobs[0].impl.name }, () =>
      this.runJob(jobs[0])
    );
  };

  private handleStop = () => {
    this.benchRef.current?.stop();
    if (this.cooldownTimer) clearTimeout(this.cooldownTimer);
    this.cooldownTimer = null;
    this.setState({ status: 'idle', queue: [] });
  };

  private handleClear = () => {
    this.setState({ results: [] });
  };

  private handleComplete = (result: BenchmarkResult) => {
    const { selectedCase, selectedImpl, queue, results, autoMode } = this.state;
    const newResult: Result = { caseName: selectedCase, implName: selectedImpl, result, ts: Date.now() };

    if (this.profilingActive) {
      const safe = `${selectedImpl}-${selectedCase.replace(/[^a-z0-9]+/gi, '-')}.cpuprofile`;
      const profile = stopProfile(safe);
      this.profilingActive = false;
      if (autoMode === 'on' && profile.path) {
        postReceiver('/profile', {
          caseName: selectedCase,
          implName: selectedImpl,
          fileName: safe,
          path: profile.path,
        });
      }
    }

    if (autoMode === 'on') {
      postReceiver('/result', { caseName: newResult.caseName, implName: newResult.implName, result, ts: newResult.ts });
    }

    if (queue.length === 0) {
      this.setState({ status: 'cooldown', results: [newResult, ...results] });
      this.cooldownTimer = setTimeout(() => {
        this.cooldownTimer = null;
        this.setState({ status: 'idle' });
        if (autoMode === 'on') {
          const allowedLibs = this.runConfig.libs;
          const libCount = allowedLibs.length === 0 ? implementations.length : allowedLibs.length;
          postReceiver('/done', { totalExpected: Object.keys(tests).length * libCount });
        }
      }, COOLDOWN_MS);
      return;
    }

    const [next, ...rest] = queue;
    this.setState(
      {
        status: 'cooldown',
        results: [newResult, ...results],
        selectedCase: next.caseName,
        selectedImpl: next.impl.name,
        queue: rest,
      },
      () => {
        this.cooldownTimer = setTimeout(() => {
          this.cooldownTimer = null;
          this.runJob(next);
        }, COOLDOWN_MS);
      }
    );
  };

  private getActiveCase(): { caseName: string; testCase: BenchCase; impl: Implementation } | null {
    const testCase = tests[this.state.selectedCase];
    const impl = implementations.find((i) => i.name === this.state.selectedImpl);
    if (!testCase || !impl) return null;
    return { caseName: this.state.selectedCase, testCase, impl };
  }

  render() {
    const { selectedCase, selectedImpl, status, results, queue } = this.state;
    const isRunning = status === 'running' || status === 'cooldown';
    const active = this.getActiveCase();

    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>SC iOS Benchmark</Text>
          <Text style={styles.subtle}>Hermes V1 · RN 0.85.2 · simulator perf is RELATIVE only</Text>

          <Text style={styles.sectionLabel}>Case</Text>
          <View style={styles.row}>
            {Object.keys(tests).map((name) => (
              <Pressable
                key={name}
                onPress={() => !isRunning && this.setState({ selectedCase: name })}
                style={({ pressed }) => [
                  styles.chip,
                  selectedCase === name && styles.chipActive,
                  isRunning && styles.chipDisabled,
                  pressed && !isRunning && styles.chipPressed,
                ]}
              >
                <Text style={[styles.chipText, selectedCase === name && styles.chipTextActive]}>
                  {name}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Library</Text>
          <View style={styles.row}>
            {implementations.map((i) => (
              <Pressable
                key={i.name}
                onPress={() => !isRunning && this.setState({ selectedImpl: i.name })}
                style={({ pressed }) => [
                  styles.chip,
                  selectedImpl === i.name && styles.chipActive,
                  isRunning && styles.chipDisabled,
                  pressed && !isRunning && styles.chipPressed,
                ]}
              >
                <Text style={[styles.chipText, selectedImpl === i.name && styles.chipTextActive]}>
                  {i.name}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.controls}>
            {!isRunning && (
              <>
                <Pressable
                  onPress={this.handleRunOne}
                  style={({ pressed }) => [styles.button, styles.buttonPrimary, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.buttonTextPrimary}>Run</Text>
                </Pressable>
                <Pressable
                  onPress={this.handleRunAll}
                  style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.buttonText}>Run all</Text>
                </Pressable>
                <Pressable
                  onPress={this.handleClear}
                  style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.buttonText}>Clear</Text>
                </Pressable>
              </>
            )}
            {isRunning && (
              <Pressable
                onPress={this.handleStop}
                style={({ pressed }) => [styles.button, styles.buttonDanger, pressed && styles.buttonPressed]}
              >
                <Text style={styles.buttonTextPrimary}>Stop{queue.length > 0 ? ` (${queue.length} queued)` : ''}</Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.sectionLabel}>Status</Text>
          <Text style={styles.status}>
            {status === 'idle' && 'idle'}
            {status === 'running' && `running ${selectedImpl} · ${selectedCase}`}
            {status === 'cooldown' && `cooldown (${COOLDOWN_MS}ms)`}
            {this.state.autoMode === 'on' && '  ·  AUTO (receiver attached)'}
            {this.state.autoMode === 'pending' && '  ·  checking receiver...'}
          </Text>

          <Text style={styles.sectionLabel}>Live preview</Text>
          <View style={styles.previewFrame}>
            <View style={styles.previewClip} pointerEvents="none">
              {active && (
                <Benchmark
                  ref={this.benchRef}
                  component={active.testCase.Component}
                  type={active.testCase.type}
                  sampleCount={active.testCase.sampleCount}
                  timeout={active.testCase.timeout}
                  getComponentProps={(info) => active.testCase.getComponentProps(info, active.impl.components)}
                  onComplete={this.handleComplete}
                />
              )}
            </View>
          </View>

          <Text style={styles.sectionLabel}>Results</Text>
          {results.length === 0 && <Text style={styles.subtle}>No runs yet.</Text>}
          {Object.entries(groupResultsByCase(results)).map(([caseName, rows]) => (
            <View key={caseName} style={styles.resultGroup}>
              <Text style={styles.resultGroupHeader}>{caseName}</Text>
              {rows.map((r, idx) => (
                <View key={`${r.implName}-${idx}`} style={styles.result}>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLib}>{r.implName}</Text>
                    <Text style={styles.resultMedian}>{r.result.median.toFixed(2)} ms</Text>
                  </View>
                  <Text style={styles.resultBody}>
                    mean {r.result.mean.toFixed(2)} ± {r.result.stdDev.toFixed(2)}  ·  min {r.result.min.toFixed(2)}  ·  max {r.result.max.toFixed(2)}  ·  n={r.result.sampleCount}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }
}

// Bucket results by caseName, then sort each bucket by median ascending so
// the fastest implementation per case is at the top. Cases preserve the
// order they were first run in (insertion order of caseName encounter).
function groupResultsByCase(results: Result[]): Record<string, Result[]> {
  const grouped: Record<string, Result[]> = {};
  for (const r of results) {
    if (!grouped[r.caseName]) grouped[r.caseName] = [];
    grouped[r.caseName].push(r);
  }
  for (const caseName of Object.keys(grouped)) {
    grouped[caseName].sort((a, b) => a.result.median - b.result.median);
  }
  return grouped;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0d10' },
  scroll: { padding: 16, paddingBottom: 80 },
  title: { color: '#fff', fontSize: 22, fontWeight: '600' },
  subtle: { color: '#7a8390', fontSize: 12, marginTop: 4 },
  sectionLabel: { color: '#a0a8b4', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginTop: 16, marginBottom: 6, letterSpacing: 0.5 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#1a1f26', borderWidth: 1, borderColor: '#2a313b' },
  chipActive: { backgroundColor: '#2a3a5e', borderColor: '#3b5489' },
  chipPressed: { opacity: 0.6 },
  chipDisabled: { opacity: 0.5 },
  chipText: { color: '#cbd2dd', fontSize: 12 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  controls: { flexDirection: 'row', gap: 8, marginTop: 16 },
  button: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1a1f26', borderWidth: 1, borderColor: '#2a313b' },
  buttonPrimary: { backgroundColor: '#2563eb', borderColor: '#3b82f6' },
  buttonDanger: { backgroundColor: '#b91c1c', borderColor: '#dc2626' },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: '#cbd2dd', fontSize: 13, fontWeight: '500' },
  buttonTextPrimary: { color: '#fff', fontSize: 13, fontWeight: '600' },
  status: { color: '#cbd2dd', fontSize: 12 },
  previewFrame: {
    height: 240,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a313b',
    backgroundColor: '#0f1318',
    overflow: 'hidden',
  },
  previewClip: { flex: 1 },
  resultGroup: { marginBottom: 12 },
  resultGroupHeader: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  result: { backgroundColor: '#161a20', padding: 10, borderRadius: 6, marginBottom: 4 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 },
  resultLib: { color: '#cbd2dd', fontSize: 12, fontWeight: '600' },
  resultMedian: { color: '#22c55e', fontSize: 13, fontWeight: '700', fontFamily: 'Menlo' },
  resultBody: { color: '#9aa5b3', fontSize: 11, fontFamily: 'Menlo' },
});
