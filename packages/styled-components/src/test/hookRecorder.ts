/**
 * Records which React hooks a render calls, in order.
 *
 * It wraps React's own `use*` exports, so it sees a hook the library calls as
 * `React.useX` and misses one reached through a named `import { useX } from 'react'`.
 * The default import matters: a namespace import is a private copy under Babel's
 * interop, so patching it would record nothing.
 */
import React from 'react';

/** Runs `run` and returns its result with the hook names it called, in call order. */
export type RecordHooks = <T>(run: () => T) => [T, string[]];

const reactHooks = React as unknown as Record<string, (...args: unknown[]) => unknown>;

/**
 * Patches every React hook for the duration of `body` and restores them afterward,
 * including when the install itself or `body` throws, so a failure never leaves
 * React half-patched for later tests. `hookNames` lists what was wrapped.
 */
export function withHookRecorder<R>(
  body: (recorder: { hookNames: string[]; record: RecordHooks }) => R
): R {
  const hookNames = Object.keys(reactHooks).filter(
    key => key.startsWith('use') && typeof reactHooks[key] === 'function'
  );
  const originals = new Map<string, (...args: unknown[]) => unknown>();
  let recording: string[] | null = null;

  const record: RecordHooks = run => {
    const calls: string[] = [];
    recording = calls;
    try {
      return [run(), calls];
    } finally {
      // Cleared even when the render throws, so a later render cannot append to a
      // dead array and turn one failure into a confusing second one.
      recording = null;
    }
  };

  try {
    for (const name of hookNames) {
      const original = reactHooks[name];
      originals.set(name, original);
      reactHooks[name] = (...args) => {
        if (recording !== null) recording.push(name);
        return original(...args);
      };
    }

    return body({ hookNames, record });
  } finally {
    for (const [name, original] of originals) reactHooks[name] = original;
  }
}
