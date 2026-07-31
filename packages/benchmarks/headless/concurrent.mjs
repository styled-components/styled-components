/**
 * Controlled matrix runner for the concurrent CSS responsiveness case.
 *
 * Launches headless Chrome, throttles the CPU, and drives the case with
 * trusted keystrokes over raw CDP (no puppeteer dependency; Node's built-in
 * WebSocket). Each run gets a fresh page so sheet and class caches cannot
 * leak across runs. Warmups are discarded.
 *
 * Usage:
 *   node --expose-gc headless/concurrent.mjs [--runs 8] [--warmup 1] [--throttle 4]
 *
 * The benchmarks app must already be served on 127.0.0.1:8899
 * (devctl `benchmarks` on this worktree, or any static server of packages/benchmarks).
 */

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getMedian } from '../src/app/Benchmark/math.js';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://127.0.0.1:8899/index.html';
const KEYS = 24;
const KEY_INTERVAL_MS = 60;
const PROBE_KEYS = 6;
const PROBE_KEY_INTERVAL_MS = 400;
const SETTLE_MS = 700;

const args = Object.fromEntries(
  process.argv.slice(2).map((v, i, a) => [v.replace(/^--/, ''), a[i + 1]])
);
const RUNS = Number(args.runs ?? 8); // per cell, excluding warmups
const WARMUP = Number(args.warmup ?? 1); // per cell
const THROTTLE = Number(args.throttle ?? 4);

const CELLS = [
  // Adversarial: every discarded render would have written distinct rules.
  { name: 'unique-forced', card: 'unique', sel: 'narrow', layout: 'forced', sched: 'interrupted' },
  // Realistic dynamic: bounded cardinality, no forced reads. Prediction: parity.
  { name: 'bounded-plain', card: 'bounded', sel: 'narrow', layout: 'none', sched: 'interrupted' },
  // Fully cached control: no new classes at all. Prediction: parity, zero writes.
  { name: 'zero-cached', card: 'zero', sel: 'narrow', layout: 'none', sched: 'interrupted' },
];

/* ---------------------------------------------------------------- *
 * Minimal CDP client over the browser-level WebSocket.
 * ---------------------------------------------------------------- */

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
  }

  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    return new CDP(ws);
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }

  async evaluate(sessionId, expression, awaitPromise = false) {
    const res = await this.send(
      'Runtime.evaluate',
      { expression, awaitPromise, returnByValue: true },
      sessionId
    );
    if (res.exceptionDetails) {
      throw new Error('page exception: ' + JSON.stringify(res.exceptionDetails).slice(0, 400));
    }
    return res.result ? res.result.value : undefined;
  }
}

/* ---------------------------------------------------------------- *
 * Chrome lifecycle.
 * ---------------------------------------------------------------- */

async function launchChrome() {
  const profile = join(
    tmpdir(),
    `sc-concurrent-${process.pid}-${Math.random().toString(36).slice(2, 8)}`
  );
  const proc = spawn(
    CHROME,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--disable-extensions',
      '--window-size=1200,800',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );

  const wsUrl = await new Promise((resolve, reject) => {
    let buf = '';
    proc.stderr.on('data', d => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) resolve(m[1]);
    });
    proc.on('exit', () =>
      reject(new Error('chrome exited before DevTools URL: ' + buf.slice(0, 300)))
    );
    setTimeout(() => reject(new Error('timed out waiting for DevTools URL')), 15000);
  });

  return { proc, wsUrl, profile };
}

/** SIGTERM, then SIGKILL if the instance is still alive after the grace
 *  period; wedged renderers can shrug off SIGTERM and spin at full CPU, and
 *  a few of those accumulate into a machine-wide slowdown that wedges every
 *  subsequent run. */
async function killChrome(proc) {
  if (proc.exitCode !== null || proc.signalCode !== null) return;
  proc.kill('SIGTERM');
  const dead = await Promise.race([
    new Promise(r => proc.once('exit', () => r(true))),
    sleep(2500).then(() => false),
  ]);
  if (!dead) {
    proc.kill('SIGKILL');
    await Promise.race([new Promise(r => proc.once('exit', () => r(true))), sleep(1500)]);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Positive control: prove trusted CDP keystrokes populate Event Timing on a
 * trivial page before believing zeros from the real workload. Exits the
 * matrix loudly if the instrument itself is blind.
 */
async function positiveControl(cdp, sessionId) {
  await cdp.send(
    'Page.navigate',
    {
      url:
        'data:text/html,<input id=i autofocus><script>window.__n=-1;' +
        'new PerformanceObserver(l=>{window.__n=l.getEntries().length}).observe({type:"event",durationThreshold:1});' +
        'document.getElementById("i").focus();</script>',
    },
    sessionId
  );
  await sleep(500);
  await cdp.evaluate(sessionId, `document.getElementById('i').focus()`);
  await cdp.send(
    'Input.dispatchKeyEvent',
    {
      type: 'rawKeyDown',
      key: 'z',
      code: 'KeyZ',
      windowsVirtualKeyCode: 90,
      nativeVirtualKeyCode: 90,
    },
    sessionId
  );
  await cdp.send(
    'Input.dispatchKeyEvent',
    { type: 'char', key: 'z', code: 'KeyZ', text: 'z' },
    sessionId
  );
  await cdp.send(
    'Input.dispatchKeyEvent',
    { type: 'keyUp', key: 'z', code: 'KeyZ', windowsVirtualKeyCode: 90, nativeVirtualKeyCode: 90 },
    sessionId
  );
  await sleep(500);
  const probe = await cdp.evaluate(
    sessionId,
    `({obs: window.__n, buf: performance.getEntriesByType('event').length})`
  );
  process.stdout.write(
    `[control] trusted key -> observer entries=${probe.obs} buffered entries=${probe.buf}\n`
  );
  if (probe.obs <= 0 && probe.buf <= 0) {
    throw new Error('control failed: trusted keystroke produced no Event Timing entries');
  }
}

/* ---------------------------------------------------------------- *
 * One run: fresh page, trusted keystrokes, drained instrumentation.
 * ---------------------------------------------------------------- */

const RUN_WATCHDOG_MS = 120000;

async function runOnce(cdp, sessionId, cell) {
  const t0 = Date.now();
  const step = name =>
    process.stdout.write(`    [${((Date.now() - t0) / 1000).toFixed(1)}s] ${name}\n`);

  const benchName = 'Concurrent CSS responsiveness';
  const url =
    `${BASE}?bench=${encodeURIComponent(benchName)}` +
    `&card=${cell.card}&sel=${cell.sel}&layout=${cell.layout}` +
    `&sched=${cell.sched}&driver=external`;
  await cdp.send('Page.navigate', { url }, sessionId);
  step('navigated');

  // Poll for the runner API; the bench= param mounts the case directly.
  const ready = await cdp.evaluate(
    sessionId,
    `(async () => {
      for (let i = 0; i < 60; i++) {
        if (window.__scBench) return true;
        await new Promise(r => setTimeout(r, 100));
      }
      return false;
    })()`,
    true
  );
  if (!ready) throw new Error('case never mounted (__scBench absent after 6s)');
  step('case mounted');

  await cdp.evaluate(sessionId, `window.__scBench.start()`);
  step('started');

  // Two lanes, by design. The churn lane drives urgent + transition updates
  // in-page at the fixed cadence. Latency evidence comes from sparse trusted
  // CDP keys into the UNFOCUSED document: focusing the text field makes each
  // trusted keystroke run native text-insertion machinery alongside the churn
  // and wedges the renderer outright (reproduced in isolation, controlled and
  // uncontrolled inputs alike), while unfocused keys record complete Event
  // Timing entries (queue delay + processing + presentation) without it.
  const churn = cdp.evaluate(
    sessionId,
    `(async () => {
      for (let i = 1; i <= ${KEYS}; i++) {
        window.__scBench.drive('q' + i);
        await new Promise(r => setTimeout(r, ${KEY_INTERVAL_MS}));
      }
      return true;
    })()`,
    true
  );

  for (let k = 0; k < PROBE_KEYS; k++) {
    const ch = String.fromCharCode(97 + k);
    const code = 65 + k;
    const events = [
      {
        type: 'rawKeyDown',
        key: ch,
        code: 'Key' + ch.toUpperCase(),
        windowsVirtualKeyCode: code,
        nativeVirtualKeyCode: code,
      },
      { type: 'char', key: ch, code: 'Key' + ch.toUpperCase(), text: ch },
      {
        type: 'keyUp',
        key: ch,
        code: 'Key' + ch.toUpperCase(),
        windowsVirtualKeyCode: code,
        nativeVirtualKeyCode: code,
      },
    ];
    for (const params of events) {
      cdp.send('Input.dispatchKeyEvent', params, sessionId).catch(() => {});
    }
    await sleep(PROBE_KEY_INTERVAL_MS);
  }
  step('probe keys sent');

  await churn;
  step('churn done');

  await sleep(SETTLE_MS);
  step('settled');
  const report = await cdp.evaluate(sessionId, `window.__scBench.finish()`);
  step('finished');
  return report;
}

function withWatchdog(promise, label, capture) {
  return Promise.race([
    promise,
    sleep(RUN_WATCHDOG_MS).then(async () => {
      let evidence = 'no evidence (capture failed)';
      try {
        evidence = await Promise.race([capture(), sleep(8000).then(() => 'capture timed out')]);
      } catch (e) {
        evidence = 'capture threw: ' + String(e).slice(0, 200);
      }
      throw new Error(`watchdog: run exceeded ${RUN_WATCHDOG_MS / 1000}s (${label})\n${evidence}`);
    }),
  ]);
}

/* ---------------------------------------------------------------- *
 * Matrix + reporting.
 * ---------------------------------------------------------------- */

const p90 = xs => {
  const s = xs.slice().sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.9))] : 0;
};

async function main() {
  const all = [];

  // One browser for the positive control.
  {
    const chrome = await launchChrome();
    try {
      const cdp = await CDP.connect(chrome.wsUrl);
      const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
      await cdp.send('Runtime.enable', {}, sessionId);
      await cdp.send('Page.enable', {}, sessionId);
      await positiveControl(cdp, sessionId);
    } finally {
      await killChrome(chrome.proc);
    }
  }

  // Fresh Chrome per run. Same-site navigations reuse the renderer process,
  // and long-lived headless instances degrade measurably across successive
  // targets (page mounts went 0.6s -> 7.4s -> 14.1s, then wedged past the
  // watchdog entirely). A fresh instance per run removes all cross-run state.
  const withSession = async fn => {
    const chrome = await launchChrome();
    try {
      const cdp = await CDP.connect(chrome.wsUrl);
      const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
      await cdp.send('Runtime.enable', {}, sessionId);
      await cdp.send('Page.enable', {}, sessionId);
      if (THROTTLE > 1) {
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE }, sessionId);
      }
      return await fn(cdp, sessionId);
    } finally {
      await killChrome(chrome.proc);
    }
  };

  for (const cell of CELLS) {
    for (let r = 0; r < WARMUP + RUNS; r++) {
      const warmup = r < WARMUP;
      process.stdout.write(`[${cell.name}] navigating + running…\n`);
      let sessionForCapture = null;
      const report = await withWatchdog(
        withSession((cdp, sessionId) => {
          sessionForCapture = { cdp, sessionId };
          return runOnce(cdp, sessionId, cell);
        }),
        cell.name,
        async () => {
          if (!sessionForCapture) return 'no session';
          const { cdp, sessionId } = sessionForCapture;
          // The V8 profiler samples out of band: it answers even when the
          // renderer main thread never yields, which is exactly when a
          // Runtime.evaluate capture cannot run.
          await cdp.send('Profiler.enable', {}, sessionId);
          await cdp.send('Profiler.start', {}, sessionId);
          await sleep(3000);
          const { profile } = await cdp.send('Profiler.stop', {}, sessionId);
          const profPath = `/tmp/sc-watchdog-${Date.now()}.cpuprofile`;
          writeFileSync(profPath, JSON.stringify(profile));
          const hits = new Map();
          for (const s of profile.samples || []) hits.set(s, (hits.get(s) || 0) + 1);
          const byId = new Map((profile.nodes || []).map(n => [n.id, n]));
          const top = [...hits.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(([id, n]) => {
              const f = byId.get(id);
              const fn = f ? f.callFrame : {};
              return `${n}x ${fn.functionName || '(anon)'} ${(fn.url || '').split('/').pop()}:${fn.lineNumber}`;
            });
          return 'profile: ' + profPath + '\ntop frames:\n  ' + top.join('\n  ');
        }
      );
      all.push({ cell: cell.name, warmup, report });
      const tag = warmup ? 'warmup' : 'run';
      process.stdout.write(
        `[${cell.name} ${tag}] discQ=${report.discardedQueries} ` +
          `ins=${report.insertRuleCalls} durMed=${report.eventDurationMedianMs.toFixed(0)}ms ` +
          `delayMed=${report.inputDelayMedianMs.toFixed(1)}ms procMed=${report.processingMedianMs.toFixed(1)}ms ` +
          `${report.failed.length ? 'FAILED: ' + report.failed.join('; ') : ''}\n`
      );
    }
  }

  const outDir = join(new URL('.', import.meta.url).pathname, 'out');
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `concurrent-${Date.now()}.json`);
  writeFileSync(outFile, JSON.stringify({ throttle: THROTTLE, runs: RUNS, results: all }, null, 2));

  // Summary table over non-warmup runs.
  console.log('\n=== summary (median across runs; throttle ' + THROTTLE + 'x) ===');
  for (const cell of CELLS) {
    const rs = all.filter(x => x.cell === cell.name && !x.warmup);
    const get = k => rs.map(x => x.report[k]);
    console.log(
      `${cell.name.padEnd(14)} ` +
        `durMed=${getMedian(get('eventDurationMedianMs')).toFixed(0)}ms ` +
        `durP90=${p90(get('eventDurationMedianMs')).toFixed(0)}ms ` +
        `delayMed=${getMedian(get('inputDelayMedianMs')).toFixed(1)}ms ` +
        `procMed=${getMedian(get('processingMedianMs')).toFixed(1)}ms ` +
        `discQ=${getMedian(get('discardedQueries')).toFixed(1)} ` +
        `insMed=${getMedian(get('insertRuleCalls')).toFixed(0)} ` +
        `fails=${rs.filter(x => x.report.failed.length).length}/${rs.length}`
    );
  }
  console.log('\nwrote ' + outFile);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
