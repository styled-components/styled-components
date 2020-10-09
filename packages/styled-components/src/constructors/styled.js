// @flow
import constructWithOptions from './constructWithOptions';
import StyledComponent from '../models/StyledComponent';
import domElements from '../utils/domElements';

import type { Target } from '../types';

const styled = (tag: Target) => constructWithOptions(StyledComponent, tag);

// Shorthands for all valid HTML Elements
for (let i = 0; i < domElements.length; i += 1) {
  styled[domElements[i]] = styled(domElements[i]);
}

export default styled;
