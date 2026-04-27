/**
 * Native-test setup. Runs before each native test file.
 *
 * React 19's `react-test-renderer` unmounts the returned renderer
 * synchronously if `create()` isn't wrapped in `act()` — every `.root`
 * access on an un-acted renderer throws. Rather than refactor every
 * `TestRenderer.create(<Foo />)` call-site in the native suite, we
 * monkey-patch `create` to auto-wrap in `act`. Keeps the existing tests
 * readable and lets us migrate to `@testing-library/react-native` on a
 * separate pass if we ever want the RN-idiomatic API.
 */
import { act } from 'react';
import TestRenderer from 'react-test-renderer';

// Flip the build-time constant used by `createTheme` / `ThemeProvider`
// to route through the native branch. The production rollup config
// sets this via `replace`; under jest we assign at setup time.
(global as any).__NATIVE__ = true;

const originalCreate = TestRenderer.create;
(TestRenderer as any).create = ((...args: Parameters<typeof originalCreate>) => {
  let result: ReturnType<typeof originalCreate> | undefined;
  act(() => {
    result = originalCreate(...args);
  });
  // Also wrap `update` and `unmount` so re-renders / teardown flow through act.
  const originalUpdate = result!.update.bind(result);
  result!.update = (...updateArgs: Parameters<typeof originalUpdate>) => {
    let updateResult: ReturnType<typeof originalUpdate>;
    act(() => {
      updateResult = originalUpdate(...updateArgs);
    });
    return updateResult!;
  };
  const originalUnmount = result!.unmount.bind(result);
  result!.unmount = () => {
    act(() => {
      originalUnmount();
    });
  };
  return result!;
}) as typeof originalCreate;
