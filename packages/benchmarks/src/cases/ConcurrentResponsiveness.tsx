/**
 * Concurrent CSS responsiveness.
 *
 * An always-urgent controlled input competes with a large transition-rendered
 * result tree that injects styled-components rules via `useInsertionEffect`.
 * Measures whether input stays responsive while the background tree renders,
 * suspends, restarts, and discards work.
 *
 * This case reports interaction evidence (Event Timing, CSSOM writes, render
 * attempts vs commits, discarded renders) rather than the generic cycle
 * throughput that `app/Benchmark` computes, so it owns its own run loop.
 * See `headless/concurrent.mjs`.
 */
import React from 'react';
import styled from 'styled-components';
import { getMedian } from '../app/Benchmark/math.js';

/* ------------------------------------------------------------------ *
 * Deterministic data: stable across runs so results are comparable.
 * ------------------------------------------------------------------ */

/** Deterministic pseudo-random in [0,1) from an integer seed (mulberry32). */
const rand = (seed: number) => {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Bounded palette; "unique" mode derives a fresh hex per cell. */
const PALETTE = ['#E0245E', '#FFAD1F', '#F45D22', '#17BF63', '#1DA1F2', '#794BC4'];

/**
 * Content hash of the query string. Colors key off this so every committed
 * query visibly repaints the grid; keying off query length (or nothing)
 * leaves the squares static across a run, which reads as "nothing happened".
 */
const qhash = (q: string) => {
  let h = 0;
  for (let i = 0; i < q.length; i++) h = (h * 33 + q.charCodeAt(i)) | 0;
  return h >>> 0;
};

type Axis = {
  /** new class cardinality: 0 (cached), bounded, or unique-per-render */
  cardinality: 'zero' | 'bounded' | 'unique';
  /** selector invalidation breadth */
  selector: 'narrow' | 'descendant' | 'has';
  /** forced style/layout reads during render */
  layoutReads: 'none' | 'forced';
  /** scheduling: blocking, transition, transition interrupted by urgent input */
  scheduling: 'blocking' | 'transition' | 'interrupted';
};

export type InstrumentReport = {
  cell: string;
  inputCount: number;
  /** INP-style keydown duration: queue delay + processing + presentation. */
  eventDurationMedianMs: number;
  eventDurationMaxMs: number;
  /** Queue wait before the handler starts (processingStart - startTime). */
  inputDelayMedianMs: number;
  /** Handler execution time (processingEnd - processingStart). */
  processingMedianMs: number;
  renderAttempts: number;
  commits: number;
  /** Query values rendered but never committed. */
  discardedQueries: number;
  /** Cell renders against discarded queries (the wasted work). */
  discardedRenders: number;
  insertRuleCalls: number;
  failed: string[];
};

/* ------------------------------------------------------------------ *
 * Instrumentation: module-level counters, fail-loud preconditions.
 * ------------------------------------------------------------------ */

export const Instrument = {
  renderAttempts: 0,
  commits: 0,
  insertRuleCalls: 0,
  /** performance.now() at run start; Event Timing entries are drained at finish. */
  runStart: 0,
  /** Event Timing key entries captured by the live observer. */
  events: [] as PerformanceEventTiming[],
  /** name → count over every observed entry (diagnostics). */
  eventNameCounts: {} as Record<string, number>,
  /** Entries dropped after the cap (diagnostics). */
  observerDropped: 0,
  /** Distinct query values that reached a render body. */
  renderedQueries: new Set<string>(),
  /** Distinct query values whose tree actually committed. */
  committedQueries: new Set<string>(),
  reset() {
    this.renderAttempts = 0;
    this.commits = 0;
    this.insertRuleCalls = 0;
    this.runStart = performance.now();
    this.events = [];
    this.eventNameCounts = {};
    this.observerDropped = 0;
    this.renderedQueries = new Set();
    this.committedQueries = new Set();
  },
};

// Hook the CSSOM insertion point at module load so no injection happens
// before the counter is live.
(function hookInsertRuleCounter() {
  const proto = CSSStyleSheet.prototype as any;
  const real = proto.insertRule;
  proto.insertRule = function (rule: string, index?: number) {
    Instrument.insertRuleCalls++;
    return real.call(this, rule, index);
  };
})();

// Buffer Event Timing entries from page load. Without a registered observer
// the UA drops events under the default 104ms duration threshold, which is
// exactly where healthy input latency lives. Only discrete key events are
// buffered: continuous event streams (pointermove, wheel, rawupdate) would
// drown them by the thousand under a saturated main thread. A drop count is
// recorded so a truncated tail is visible rather than silent.
const MAX_EVENT_ENTRIES = 4000;

function collectEventEntries(list: PerformanceObserverEntryList) {
  for (const entry of list.getEntries()) {
    Instrument.eventNameCounts[entry.name] = (Instrument.eventNameCounts[entry.name] || 0) + 1;
    if (entry.name !== 'keydown' && entry.name !== 'keyup') continue;
    if (Instrument.events.length >= MAX_EVENT_ENTRIES) {
      Instrument.observerDropped++;
      continue;
    }
    Instrument.events.push(entry as PerformanceEventTiming);
  }
}

try {
  if (typeof PerformanceObserver !== 'undefined') {
    new PerformanceObserver(collectEventEntries).observe({
      type: 'event',
      durationThreshold: 0,
    } as PerformanceObserverInit);
  }
} catch {
  try {
    new PerformanceObserver(collectEventEntries).observe({
      type: 'event',
      durationThreshold: 1,
    } as PerformanceObserverInit);
  } catch {
    // Event Timing unsupported; finishRun's failure message will say so.
  }
}

/* ------------------------------------------------------------------ *
 * The tree. A grid of cells whose color derives from the query. The
 * styled component is created inside the case (per run) so each axis can
 * vary cardinality / selector breadth / layout reads independently.
 * ------------------------------------------------------------------ */

/**
 * Tree sizes. Headed self-drive has no CPU throttle, so it needs a larger
 * tree (and a tighter tick) than the external runner for a unique-class pass
 * to outlast the input cadence on a desktop. Below SELF_CELLS_FLOOR the
 * interrupted axis silently completes every pass.
 */
const CELLS_EXTERNAL = 1500;
const CELLS_SELF = 4000;
const SELF_CELLS_FLOOR = 2500;
/** Self-drive: enough ticks to watch, cadence shorter than one unique pass. */
const SELF_STEPS = 40;
const SELF_INTERVAL_MS = 48;

function CellView({
  Cell,
  seed,
  query,
  axis,
}: {
  Cell: any;
  seed: number;
  query: string;
  axis: Axis;
}) {
  Instrument.renderAttempts++;

  // Optional forced style/layout read during render (worst case). Sparse on
  // purpose: per-cell reads interleaved with per-cell stylesheet invalidation
  // is O(n^2) on the document and wedges the renderer for minutes. Every 20th
  // is enough, with CELLS_SELF, for a unique pass to outrun SELF_INTERVAL_MS
  // without throttle.
  if (
    axis.layoutReads === 'forced' &&
    seed % 20 === 0 &&
    typeof document !== 'undefined' &&
    document.body
  ) {
    // Reading offsetWidth forces style recalc + layout synchronously.
    void document.body.offsetWidth;
  }

  Instrument.renderedQueries.add(query);

  const qh = qhash(query);
  const colorIndex =
    axis.cardinality === 'zero'
      ? seed % 2 // reuse cached classes
      : axis.cardinality === 'bounded'
        ? // Rotate assignment per query: the same bounded class set cycles
          // across cells each commit, so the repaint is visible while the
          // stylesheet stays at six rules.
          (seed + qh) % PALETTE.length
        : seed; // unique: distinct class per cell

  const bg =
    axis.cardinality === 'unique'
      ? '#' +
        Math.floor(rand(seed * 7 + qh) * 0xffffff)
          .toString(16)
          .padStart(6, '0')
      : PALETTE[colorIndex];

  return <Cell $bg={bg} $q={query} data-seed={seed} />;
}

const MemoCellView = React.memo(CellView);

const ResultTree = React.memo(function ResultTree({
  Cell,
  query,
  axis,
  onCommit,
}: {
  Cell: any;
  query: string;
  axis: Axis & { cells: number };
  onCommit: () => void;
}) {
  const cells = [];
  for (let i = 0; i < axis.cells; i++) {
    cells.push(<MemoCellView key={i} Cell={Cell} seed={i} query={query} axis={axis} />);
  }

  // Commit counter: fires only when the committed query value changes, so
  // parent re-renders (telemetry updates) do not re-fire it into a loop.
  // Skip the idle empty query: it would otherwise commit after startRun's
  // Instrument.reset and pollute discard accounting.
  React.useEffect(() => {
    if (!query) return;
    Instrument.commits++;
    Instrument.committedQueries.add(query);
    onCommit();
  }, [query]);

  return <div data-tree="">{cells}</div>;
});

/* ------------------------------------------------------------------ *
 * The case component. Owns its own run loop and input instrumentation.
 * ------------------------------------------------------------------ */

export default function ConcurrentResponsiveness({
  benchmarkRunning,
  onBenchmarkComplete,
}: {
  /** The harness's Run button state; a false→true edge starts the workload. */
  benchmarkRunning?: boolean;
  /** Called with the finished report so the harness can close its own run. */
  onBenchmarkComplete?: (payload: {
    sampleCount: number;
    mean: number;
    stdDev: number;
    report: InstrumentReport;
  }) => void;
}) {
  const [axis] = React.useState(() => readAxis());
  const [running, setRunning] = React.useState(false);
  const [report, setReport] = React.useState<InstrumentReport | null>(null);
  const [query, setQuery] = React.useState('');
  const [deferredQuery, setDeferredQuery] = React.useState('');
  const [isPending, startTransition] = React.useTransition();
  /**
   * Demo telemetry for the self-drive run, refreshed per tick and per commit.
   * Self-drive is the interactive demo; its own UI updates slightly perturb
   * the workload, so measurement-grade numbers come from the external runner.
   */
  const [live, setLive] = React.useState<{
    attempts: number;
    commits: number;
    discarded: number;
    insertRuleCalls: number;
    step: number;
  }>({ attempts: 0, commits: 0, discarded: 0, insertRuleCalls: 0, step: 0 });
  /** Background wash for the tree container, flooded on each commit. */
  const [treeWash, setTreeWash] = React.useState('transparent');

  const runState = React.useRef<{ inputs: number; done: boolean; timer: number | null }>({
    inputs: 0,
    done: false,
    timer: null,
  });

  // The styled cell, created once per axis so selector breadth is fixed per run.
  const Cell = React.useMemo(() => makeCell(axis), [axis]);

  function readAxis(): Axis & { driver: 'self' | 'external'; cells: number } {
    const p = new URLSearchParams(window.location.search);
    const driver: 'self' | 'external' = p.get('driver') === 'external' ? 'external' : 'self';
    // Default to the adversarial unique/forced/interrupted cell.
    const cardinality = (p.get('card') as Axis['cardinality']) || 'unique';
    const layoutReads = (p.get('layout') as Axis['layoutReads']) || 'forced';
    const scheduling = (p.get('sched') as Axis['scheduling']) || 'interrupted';
    const requested = Number(p.get('cells'));
    const fallback = driver === 'self' ? CELLS_SELF : CELLS_EXTERNAL;
    let cells = Number.isFinite(requested) && requested > 0 ? requested : fallback;
    // A too-small headed tree never discards; clamp so a stale ?cells=400
    // bookmark cannot silently neuter the demo.
    if (
      driver === 'self' &&
      scheduling === 'interrupted' &&
      cardinality === 'unique' &&
      cells < SELF_CELLS_FLOOR
    ) {
      cells = SELF_CELLS_FLOOR;
    }
    return {
      cardinality,
      selector: (p.get('sel') as Axis['selector']) || 'narrow',
      layoutReads,
      scheduling,
      driver,
      cells: Math.max(100, cells),
    };
  }

  /** Urgent update from a real (or scripted) keystroke on the input. */
  function driveFromInput(value: string) {
    setQuery(value);
    if (axis.scheduling === 'transition' || axis.scheduling === 'interrupted') {
      // Queue depth one: the new transition supersedes whatever is in flight,
      // so every keystroke interrupts the current pass without piling an
      // unbounded backlog of stale transitions onto the scheduler. With pass
      // cost above the input cadence this makes interruption structural and
      // keeps the workload measurable instead of livelocked.
      startTransition(() => setDeferredQuery(value));
    } else {
      setDeferredQuery(value);
    }
  }

  function snapshotLive(step: number) {
    let discarded = 0;
    Instrument.renderedQueries.forEach(q => {
      if (!Instrument.committedQueries.has(q)) discarded++;
    });
    setLive({
      attempts: Instrument.renderAttempts,
      commits: Instrument.commits,
      discarded,
      insertRuleCalls: Instrument.insertRuleCalls,
      step,
    });
  }

  /** Each committed tree floods the container wash with its query's hue. */
  function onTreeCommit(committedQuery: string) {
    if (axis.driver !== 'self') return;
    let h = 0;
    for (let i = 0; i < committedQuery.length; i++)
      h = (h * 31 + committedQuery.charCodeAt(i)) % 360;
    setTreeWash(`hsl(${h}, 70%, 90%)`);
    snapshotLive(runState.current.inputs);
  }

  function startRun() {
    Instrument.reset();
    runState.current = { inputs: 0, done: false, timer: null };
    setReport(null);
    setLive({ attempts: 0, commits: 0, discarded: 0, insertRuleCalls: 0, step: 0 });
    setTreeWash('transparent');
    setRunning(true);

    if (axis.driver === 'external') return; // the runner types trusted keys

    // Self-drive: chained timeouts (not setInterval) so a blocked main thread
    // cannot queue a burst of ticks that collapse into one transition. Synthetic
    // events do not populate Event Timing; the report says so.
    let step = 0;
    const tick = () => {
      if (runState.current.done) return;
      step++;
      runState.current.inputs++;
      driveFromInput('q' + step);
      snapshotLive(step);
      if (step >= SELF_STEPS) {
        finishRun();
        return;
      }
      runState.current.timer = window.setTimeout(tick, SELF_INTERVAL_MS);
    };
    runState.current.timer = window.setTimeout(tick, SELF_INTERVAL_MS);
  }

  function finishRun(): InstrumentReport | null {
    if (runState.current.done) return null;
    runState.current.done = true;
    if (runState.current.timer !== null) window.clearTimeout(runState.current.timer);

    // Drain the live observer's key events since run start.
    const durations: number[] = [];
    const delays: number[] = [];
    const processing: number[] = [];
    for (const entry of Instrument.events) {
      if (entry.startTime < Instrument.runStart) continue;
      durations.push(entry.duration);
      delays.push(entry.processingStart - entry.startTime);
      processing.push(entry.processingEnd - entry.processingStart);
    }

    // Discards are counted honestly: a query value whose render bodies ran
    // but whose tree never committed. Cell renders against a discarded query
    // are the wasted work concurrent rendering threw away.
    let discardedQueries = 0;
    Instrument.renderedQueries.forEach(q => {
      if (!Instrument.committedQueries.has(q)) discardedQueries++;
    });
    const discardedRenders = discardedQueries * axis.cells;

    const failed: string[] = [];
    if (Instrument.insertRuleCalls === 0 && axis.cardinality !== 'zero')
      failed.push('no insertRule calls recorded');
    if (Instrument.renderAttempts === 0) failed.push('no render attempts recorded');
    if (axis.scheduling === 'interrupted' && discardedQueries === 0)
      failed.push(
        'interrupted axis discarded nothing: render cost never exceeded the input cadence'
      );
    if (durations.length === 0) {
      const names = Object.entries(Instrument.eventNameCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([n, c]) => `${n}:${c}`)
        .join(',');
      failed.push(
        `Event Timing produced no key entries (kept=${Instrument.events.length} dropped=${Instrument.observerDropped} names=[${names}])`
      );
    }

    const max = (xs: number[]) => (xs.length ? Math.max.apply(null, xs) : 0);

    const rep: InstrumentReport = {
      cell: `card=${axis.cardinality} sel=${axis.selector} layout=${axis.layoutReads} sched=${axis.scheduling} driver=${axis.driver}`,
      inputCount: runState.current.inputs,
      eventDurationMedianMs: getMedian(durations),
      eventDurationMaxMs: max(durations),
      inputDelayMedianMs: getMedian(delays),
      processingMedianMs: getMedian(processing),
      renderAttempts: Instrument.renderAttempts,
      commits: Instrument.commits,
      discardedQueries,
      discardedRenders,
      insertRuleCalls: Instrument.insertRuleCalls,
      failed,
    };
    setReport(rep);
    setRunning(false);
    if (onBenchmarkComplete) {
      onBenchmarkComplete({
        inputCount: rep.inputCount,
        durationMs: performance.now() - Instrument.runStart,
        discardedQueries,
        insertRuleCalls: rep.insertRuleCalls,
      });
    }
    return rep;
  }

  // Runner API: the external matrix runner drives runs through these.
  React.useEffect(() => {
    const w = window as any;
    w.__scBench = { start: startRun, finish: finishRun, drive: driveFromInput, Instrument };
    return () => {
      delete w.__scBench;
    };
  });

  // Harness-driven start: the App's Run button flips benchmarkRunning.
  const wasBenchmarkRunning = React.useRef(false);
  React.useEffect(() => {
    if (benchmarkRunning && !wasBenchmarkRunning.current) startRun();
    wasBenchmarkRunning.current = !!benchmarkRunning;
  }, [benchmarkRunning]);

  return (
    <div
      style={{
        fontFamily: 'monospace',
        color: 'var(--bench-text)',
        padding: 16,
        boxSizing: 'border-box',
        width: '100%',
        height: '100%',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>Concurrent CSS responsiveness</h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center' }}>
        {!running && !report && axis.driver === 'self' ? (
          <span style={{ fontSize: 12, color: 'var(--bench-text-muted)' }}>
            Press <strong>Run</strong> in the toolbar to start the cell.
          </span>
        ) : null}
        {running ? <span style={{ color: '#E0245E' }}>running…</span> : null}
        {isPending ? <span style={{ color: '#E0245E' }}>pending</span> : null}
      </div>

      <div style={{ marginBottom: 12, fontSize: 12, opacity: 0.8 }}>
        cell: card={axis.cardinality} sel={axis.selector} layout={axis.layoutReads} sched=
        {axis.scheduling} cells={axis.cells} (URL: ?card=&sel=&layout=&sched=&cells=)
      </div>

      {axis.driver === 'self' && (running || live.step > 0) ? (
        <div data-live="" style={{ marginBottom: 12 }}>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: 'var(--bench-border)',
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, (live.step / SELF_STEPS) * 100)}%`,
                background: running ? 'var(--bench-accent)' : 'var(--bench-text-muted)',
                transition: 'width 0.1s linear',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 18, fontSize: 13 }}>
            <span>
              step <strong>{live.step}</strong>/{SELF_STEPS}
            </span>
            <span>
              rendered <strong data-live-attempts="">{live.attempts}</strong>
            </span>
            <span>
              committed <strong data-live-commits="">{live.commits}</strong>
            </span>
            <span style={{ color: live.discarded > 0 ? '#E0245E' : 'inherit' }}>
              discarded <strong data-live-discarded="">{live.discarded}</strong> queries
            </span>
            <span>
              CSSOM writes <strong data-live-ins="">{live.insertRuleCalls}</strong>
            </span>
          </div>
        </div>
      ) : null}

      {/*
       * Uncontrolled in external-driver mode: trusted input events must flow
       * through onChange like a real user's, and binding value={query} makes
       * React restore the field's value after every churn render, which wedges
       * the renderer outright when trusted text insertion lands mid-churn.
       */}
      <input
        data-urgent-input=""
        {...(axis.driver === 'external' ? { defaultValue: '' } : { value: query })}
        onChange={e => {
          runState.current.inputs++;
          driveFromInput(e.target.value);
        }}
        placeholder="urgent input"
        style={{ fontSize: 16, padding: 8, width: 320, marginBottom: 12 }}
      />

      {report ? (
        <pre
          data-report=""
          style={{
            background: 'var(--bench-surface-alt)',
            padding: 12,
            borderRadius: 8,
            fontSize: 12,
            maxWidth: '100%',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {JSON.stringify(report, null, 2)}
        </pre>
      ) : null}

      <div
        style={{
          flex: 1,
          minHeight: 180,
          maxHeight: 400,
          overflow: 'auto',
          border: '1px solid var(--bench-border)',
          backgroundColor: treeWash,
          transition: 'background-color 0.25s',
        }}
      >
        <ResultTree
          Cell={Cell}
          query={deferredQuery}
          axis={axis}
          onCommit={() => onTreeCommit(deferredQuery)}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Cell factory: selector breadth is baked in per run.
 * ------------------------------------------------------------------ */

type CellProps = { $bg: string; $q: string };

/** Always styled-components; this case is registered SC-only in the harness. */
function makeCell(axis: Axis) {
  const base = styled.div<CellProps>`
    display: inline-block;
    width: 18px;
    height: 18px;
    margin: 2px;
    background-color: ${p => p.$bg};
    outline: ${p => (p.$q.length % 2 ? '1px' : '0')} solid transparent;
  `;

  if (axis.selector === 'descendant') {
    return styled.div<CellProps>`
      display: inline-block;
      width: 18px;
      height: 18px;
      margin: 2px;
      background-color: ${p => p.$bg};
      [data-tree] & {
        outline: 1px solid transparent;
      }
    `;
  }
  if (axis.selector === 'has') {
    return styled.div<CellProps>`
      display: inline-block;
      width: 18px;
      height: 18px;
      margin: 2px;
      background-color: ${p => p.$bg};
      :has(&) {
        content: '';
      }
    `;
  }
  return base;
}

ConcurrentResponsiveness.displayName = 'ConcurrentResponsiveness';
ConcurrentResponsiveness.benchmarkType = 'update';
