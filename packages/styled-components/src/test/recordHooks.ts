import React from 'react';

/**
 * React's module namespace, typed as what it is here: a bag of hook functions
 * keyed by name. Spelling the cast once keeps it out of every caller.
 */
const reactHooks = React as unknown as Record<string, (...args: unknown[]) => unknown>;

/**
 * Run `body` with every React `use*` export wrapped so each hook call is
 * recorded. `body` receives a `record` that returns what a render produced
 * alongside the ordered names of the hooks that render called.
 *
 * Names come from React's own namespace, so a hook added to the render path is
 * picked up without this helper being told about it. Originals are restored in a
 * `finally`, so a render that throws cannot leave React patched for later tests.
 * A caller asserting the recorded sequence is non-empty doubles as a positive
 * control: if wrapping ever stops seeing hooks, that assertion fails rather than
 * every sequence comparing equal because all are empty.
 */
export function withHookRecording<T>(
  body: (record: <R>(render: () => R) => [R, string[]]) => T
): T {
  const hookNames = Object.keys(React).filter(
    key => key.startsWith('use') && typeof reactHooks[key] === 'function'
  );
  const originals = new Map<string, (...args: unknown[]) => unknown>();
  let recording: string[] | null = null;

  function record<R>(render: () => R): [R, string[]] {
    const calls: string[] = [];
    recording = calls;
    try {
      return [render(), calls];
    } finally {
      recording = null;
    }
  }

  try {
    for (const name of hookNames) {
      const original = reactHooks[name];
      originals.set(name, original);
      reactHooks[name] = (...args) => {
        if (recording) recording.push(name);
        return original(...args);
      };
    }
    return body(record);
  } finally {
    for (const [name, original] of originals) reactHooks[name] = original;
  }
}
