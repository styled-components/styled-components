// @flow
import isStyledComponent from './isStyledComponent';

function getSelector(chunk: any) {
  return isStyledComponent(chunk) ? `.${chunk.styledComponentId}` : chunk.toString();
}

export default getSelector;
