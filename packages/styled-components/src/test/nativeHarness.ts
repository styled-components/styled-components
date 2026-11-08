/**
 * Shared harness for the native suites: a cascade probe, a window-size emitter and a
 * Pressable `style` function. Lives outside `src/native/test/` because every file
 * there is collected as a test file.
 */
import type { PressableStateCallbackType, TextStyle } from 'react-native';
import { Dimensions } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { useNativeStyleContext } from '../native';
import type { NativeCascadeValues } from '../native/NativeStyleContext';
import { resetResponsiveCache } from '../native/responsive';

/** The three values a descendant reads from `useNativeStyleContext().cascade`. */
export type PublishedValues = Pick<NativeCascadeValues, 'direction' | 'fontSize' | 'lineHeight'>;

/**
 * A component to place among a subject's children. `log` holds what its
 * `useNativeStyleContext()` returned on each render, so an assertion goes through the
 * public hook; `read` is the last entry.
 */
export function createCascadeProbe() {
  const log: PublishedValues[] = [];

  function Probe() {
    const { cascade } = useNativeStyleContext();
    log.push({
      direction: cascade.direction,
      fontSize: cascade.fontSize,
      lineHeight: cascade.lineHeight,
    });
    return null;
  }

  return { log, Probe, read: () => log[log.length - 1] };
}

/** A Pressable `style` function: 30px while pressed, 20px at rest. */
export const sizeByState = (state: PressableStateCallbackType): TextStyle => ({
  fontSize: state.pressed ? 30 : 20,
});

/**
 * Starts watching `Dimensions` for the responsive subscription a mount makes, so call it
 * before mounting. `emitWindowChange` delivers a window of that width to the subscriber
 * inside `act`; `restore` ends the spy and drops the subscription.
 */
export function watchWindowChange() {
  // The subscription is made once per cache; reset it so the next mount makes it under the spy.
  resetResponsiveCache();
  const spy = jest.spyOn(Dimensions, 'addEventListener');

  return {
    emitWindowChange: (width: number) => {
      const listener = spy.mock.calls.find(call => call[0] === 'change')?.[1];
      if (listener === undefined) {
        throw new Error('No component has subscribed to window changes yet; mount one first.');
      }

      const dimensions = { fontScale: 1, height: 800, scale: 2, width };
      TestRenderer.act(() => listener({ screen: dimensions, window: dimensions }));
    },
    restore: () => {
      spy.mockRestore();
      resetResponsiveCache();
    },
  };
}
