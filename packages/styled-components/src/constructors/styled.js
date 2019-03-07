// @flow
import { constructWithOptions } from './constructWithOptions';
import { createStyledComponent } from '../models';
import { domElements } from '../utils';

import type { Target } from '../types';

const styled = (tag: Target) => constructWithOptions(createStyledComponent, tag);

// Shorthands for all valid HTML Elements
domElements.forEach(domElement => {
  styled[domElement] = styled(domElement);
});

export { styled };
