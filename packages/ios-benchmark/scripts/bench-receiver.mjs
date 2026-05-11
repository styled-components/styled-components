#!/usr/bin/env node
/**
 * HTTP receiver that the iOS bench app POSTs to.
 *
 * Endpoints:
 *   GET  /health              — used by the app to detect that auto-run mode is active
 *   POST /run-config          — app fetches the planned set of jobs (case × library)
 *   POST /result              — single completed job, body { caseName, implName, result }
 *   POST /done                — app signals all jobs complete; receiver writes results.json and exits
 *   POST /profile             — optional, body { caseName, implName, fileName } (path inside app sandbox)
 *
 * Exits 0 after writing the results file. Exits 2 if the timeout elapses without /done.
 */

import { createServer } from 'node:http';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const PORT = Number(process.env.BENCH_PORT ?? 9999);
const TIMEOUT_MS = Number(process.env.BENCH_TIMEOUT_MS ?? 25 * 60 * 1000);
const OUT_DIR = process.env.BENCH_OUT_DIR
  ? resolve(process.env.BENCH_OUT_DIR)
  : resolve(process.cwd(), '.bench-results');
const PROFILE_DIR = resolve(OUT_DIR, 'profiles');
const TAG = process.env.BENCH_TAG ?? 'combined';
const LIBS = (process.env.BENCH_LIBS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const PROFILE = process.env.BENCH_PROFILE === '1';
// Comma-separated case names to profile; empty = profile all when PROFILE=1.
const PROFILE_CASES = (process.env.BENCH_PROFILE_CASES ?? '').split(',').map((s) => s.trim()).filter(Boolean);
// Comma-separated case names to run (filters the queue); empty = all cases.
const CASES = (process.env.BENCH_CASES ?? '').split(',').map((s) => s.trim()).filter(Boolean);

mkdirSync(OUT_DIR, { recursive: true });
if (PROFILE) mkdirSync(PROFILE_DIR, { recursive: true });

const session = {
  startedAt: Date.now(),
  results: [],
  profiles: [],
  done: false,
};

const readJsonBody = (req) =>
  new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolveBody(text ? JSON.parse(text) : {});
      } catch (err) {
        rejectBody(err);
      }
    });
    req.on('error', rejectBody);
  });

const send = (res, code, body) => {
  res.writeHead(code, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
  });
  res.end(JSON.stringify(body ?? { ok: true }));
};

const writeOutput = () => {
  const ts = new Date(session.startedAt).toISOString().replace(/[:.]/g, '-');
  const out = resolve(OUT_DIR, `results-${TAG}-${ts}.json`);
  writeFileSync(
    out,
    JSON.stringify(
      {
        tag: TAG,
        libs: LIBS,
        startedAt: session.startedAt,
        finishedAt: Date.now(),
        results: session.results,
        profiles: session.profiles,
      },
      null,
      2
    )
  );
  console.log(`bench-receiver: wrote ${out}`);
  return out;
};

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') return send(res, 200);

  if (req.method === 'GET' && req.url === '/run-config') {
    return send(res, 200, { tag: TAG, libs: LIBS, cases: CASES, profile: PROFILE, profileCases: PROFILE_CASES });
  }

  if (req.method === 'POST' && req.url === '/result') {
    const body = await readJsonBody(req).catch(() => ({}));
    session.results.push({ ...body, receivedAt: Date.now() });
    console.log(
      `bench-receiver: result #${session.results.length} — ${body.implName} · ${body.caseName} · mean ${body.result?.mean?.toFixed?.(2)}ms`
    );
    return send(res, 200);
  }

  if (req.method === 'POST' && req.url === '/profile') {
    const body = await readJsonBody(req).catch(() => ({}));
    let savedTo;
    // If the app sent the trace bytes inline, persist them directly.
    if (typeof body.data === 'string' && body.data.length > 0) {
      const safe = `${body.implName ?? 'unknown'}-${(body.caseName ?? 'unknown').replace(/[^a-z0-9]+/gi, '-')}.cpuprofile`;
      savedTo = resolve(PROFILE_DIR, safe);
      writeFileSync(savedTo, body.data);
      console.log(`bench-receiver: profile saved (inline ${body.data.length}B) — ${savedTo}`);
    } else if (body.path) {
      console.log(`bench-receiver: profile recorded (path only) — ${body.implName} · ${body.caseName} · ${body.path}`);
    } else {
      console.log(`bench-receiver: profile event with no data/path — ${body.implName} · ${body.caseName}`);
    }
    session.profiles.push({ ...body, savedTo, receivedAt: Date.now() });
    return send(res, 200, { ok: true, savedTo });
  }

  if (req.method === 'POST' && req.url === '/done') {
    const body = await readJsonBody(req).catch(() => ({}));
    if (body.totalExpected != null && session.results.length < body.totalExpected) {
      console.warn(
        `bench-receiver: /done received but only ${session.results.length}/${body.totalExpected} results landed`
      );
    }
    const out = writeOutput();
    session.done = true;
    send(res, 200, { ok: true, file: out });
    setTimeout(() => process.exit(0), 25);
    return;
  }

  send(res, 404, { error: `unhandled ${req.method} ${req.url}` });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`bench-receiver: listening on http://127.0.0.1:${PORT}, output -> ${OUT_DIR}`);
});

setTimeout(() => {
  if (session.done) return;
  console.error(`bench-receiver: timeout after ${TIMEOUT_MS}ms with ${session.results.length} results`);
  if (session.results.length > 0) writeOutput();
  process.exit(2);
}, TIMEOUT_MS);
