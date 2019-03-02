// @flow
import styled from './styled';
import domElements from '../utils/domElements';

import type { Target } from '../types';

const styleable = (tag: Target) => styled(tag, { allowComposition: 'appearance' });

// Shorthands for all valid HTML Elements
domElements.forEach(domElement => {
  styleable[domElement] = styleable(domElement);
});

export default styleable;
