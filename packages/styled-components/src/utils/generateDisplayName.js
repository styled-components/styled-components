// @flow
import { isTag } from './isTag';
import { getComponentName } from './getComponentName';
import type { Target } from '../types';

export function generateDisplayName(target: Target): string {
  // $FlowFixMe
  return isTag(target) ? `styled.${target}` : `Styled(${getComponentName(target)})`;
}
