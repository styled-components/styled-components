// @flow
import type { IStyledComponent } from '../types';
import getComponentName from './getComponentName';
import isTag from './isTag';

export default function generateDisplayName(
  target: $PropertyType<IStyledComponent, 'target'>
): string {
  return isTag(target) ? `styled.${target}` : `Styled(${getComponentName(target)})`;
}
