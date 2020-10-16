import { StyledTarget } from '../types';
import getComponentName from './getComponentName';
import isTag from './isTag';

export default function generateDisplayName(target: StyledTarget) {
  return isTag(target) ? `styled.${target}` : `Styled(${getComponentName(target)})`;
}
