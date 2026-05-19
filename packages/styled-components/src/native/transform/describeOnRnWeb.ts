/**
 * Declare a subtree that exercises the rn-web compile-time toggle: sets
 * `globalThis.__NATIVE_WEB__` for the enclosing `describe`, then restores the
 * prior binding. Matches `globals.ts` + AGENTS.rn-web parity tests.
 */

export function describeOnRnWeb(run: () => void): void;
export function describeOnRnWeb(title: string, run: () => void): void;
export function describeOnRnWeb(titleOrCb: string | (() => void), cbMaybe?: () => void): void {
  const title = typeof titleOrCb === 'function' ? 'on rn-web' : titleOrCb;
  const run = typeof titleOrCb === 'function' ? titleOrCb : cbMaybe!;
  const g = globalThis as { __NATIVE_WEB__?: boolean };

  describe(title, () => {
    let prev: boolean | undefined;
    beforeAll(() => {
      prev = g.__NATIVE_WEB__;
      g.__NATIVE_WEB__ = true;
    });
    afterAll(() => {
      if (prev === undefined) delete g.__NATIVE_WEB__;
      else g.__NATIVE_WEB__ = prev;
    });
    run();
  });
}
