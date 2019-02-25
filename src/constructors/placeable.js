// @flow
import styled from './styled';
import domElements from '../utils/domElements';

import type { Target } from '../types';

const placeable = (tag: Target) => styled(tag, { allow: 'layout' });

// Shorthands for all valid HTML Elements
domElements.forEach(domElement => {
  placeable[domElement] = placeable(domElement);
});

export default placeable;
