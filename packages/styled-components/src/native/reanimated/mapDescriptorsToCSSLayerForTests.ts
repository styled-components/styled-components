import type { AnimationDescriptor, TransitionDescriptor } from '../animation/types';
import { mapDescriptorsToCSSLayer, type ReanimatedMapContext } from './mapDescriptorsToCSSLayer';

/**
 * Jest-only: maps animation / transition descriptors to reanimated CSS-layer
 * style props after `react-native-reanimated` is mocked. Does not import the
 * adapter index, so it does not register as the global animation adapter.
 */
export function __mapDescriptorsToCSSLayerForTests(
  animations: AnimationDescriptor[] | undefined,
  transitions: TransitionDescriptor[] | undefined,
  ctx?: ReanimatedMapContext
): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return mapDescriptorsToCSSLayer(require('react-native-reanimated'), animations, transitions, ctx);
}
