// @flow
import constructWithOptions from './constructWithOptions';
import StyledComponent from '../models/StyledComponent';
import domElements from '../utils/domElements';

import type { Target } from '../types';

const styled = (tag: Target) => constructWithOptions(StyledComponent, tag);

// Shorthands for all valid HTML Elements
domElements.forEach(domElement => {
  styled[domElement] = styled(domElement);
});

export default styled;
