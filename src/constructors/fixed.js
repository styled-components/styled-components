// @flow
import styled from './styled';
import domElements from '../utils/domElements';

import type { Target } from '../types';

const fixed = (tag: Target) => styled(tag, { allow: 'none' });

// Shorthands for all valid HTML Elements
domElements.forEach(domElement => {
  fixed[domElement] = fixed(domElement);
});

export default fixed;
