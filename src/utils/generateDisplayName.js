// @flow
import getComponentName from './getComponentName';
import isTag from './isTag';
import type { Target } from '../types';

export default function generateDisplayName(target: Target): string {
  // $FlowFixMe
  return isTag(target) ? `styled.${target}` : `Styled(${getComponentName(target)})`;
}
