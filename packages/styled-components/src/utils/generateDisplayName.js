// @flow
import type { IStyledComponent, Target } from '../types';
import getComponentName from './getComponentName';
import isTag from './isTag';

export default function generateDisplayName(target: Target | IStyledComponent): string {
  return isTag(target) ? `styled.${target}` : `Styled(${getComponentName(target)})`;
}
