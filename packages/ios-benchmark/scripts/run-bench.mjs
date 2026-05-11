#!/usr/bin/env node
/**
 * Drive a single autonomous bench pass.
 *
 * Assumes the iosbench app is already installed on the booted iPhone simulator
 * and that Metro is either irrelevant (Release build) or already running.
 *
 * Usage:
 *   node scripts/run-bench.mjs                          # combined pass (both libs)
 *   node scripts/run-bench.mjs --libs styled-components-native             # v7-only
 *   node scripts/run-bench.mjs --libs styled-components-native-v6          # v6-only
 *   node scripts/run-bench.mjs --tag combined --libs ''                    # explicit tag
 *
 * Env overrides:
 *   BENCH_PORT (default 9999)
 *   BENCH_OUT_DIR (default .bench-results)
 *   BENCH_TIMEOUT_MS (default 600000 — total run timeout)
 *
 * Exits 0 when the receiver writes a results file, non-zero on timeout/launch failure.
 */

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (name, dflt = '') => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] ?? dflt : dflt;
};

const LIBS = flag('--libs');
const TAG = flag('--tag', LIBS ? `lib-${LIBS.replace(/[^a-z0-9]+/gi, '-')}` : 'combined');
const BUNDLE = flag('--bundle', 'org.reactjs.native.example.iosbench');
const RECEIVER_PATH = resolve(import.meta.dirname, 'bench-receiver.mjs');

const log = (...m) => console.log('[run-bench]', ...m);

const sh = (cmd, args, opts = {}) =>
  new Promise((resolveSh, rejectSh) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
    child.on('exit', (code) => (code === 0 ? resolveSh() : rejectSh(new Error(`${cmd} exited ${code}`))));
    child.on('error', rejectSh);
  });

const main = async () => {
  log(`tag=${TAG} libs=${LIBS || '(all)'}`);

  // Spawn the receiver. Inherit stdio so its log lines stream to our stdout.
  const receiver = spawn(process.execPath, [RECEIVER_PATH], {
    stdio: 'inherit',
    env: { ...process.env, BENCH_TAG: TAG, BENCH_LIBS: LIBS },
  });

  let receiverExit = null;
  receiver.on('exit', (code) => {
    receiverExit = code ?? -1;
  });

  // Wait for receiver to come up.
  for (let i = 0; i < 30; i++) {
    await sleep(200);
    try {
      const r = await fetch('http://127.0.0.1:9999/health');
      if (r.ok) break;
    } catch {}
    if (i === 29) throw new Error('receiver did not come up');
  }
  log('receiver up');

  // Relaunch the app to trigger auto-run.
  await sh('xcrun', ['simctl', 'terminate', 'booted', BUNDLE]).catch(() => {});
  await sleep(400);
  await sh('xcrun', ['simctl', 'launch', 'booted', BUNDLE]);
  log('app relaunched');

  // Wait for receiver to exit (receiver handles its own timeout).
  while (receiverExit === null) await sleep(500);

  if (receiverExit !== 0) {
    log(`receiver exited with code ${receiverExit}`);
    process.exit(receiverExit);
  }
  log('done');
};

main().catch((err) => {
  console.error('[run-bench] error:', err.message);
  process.exit(1);
});
