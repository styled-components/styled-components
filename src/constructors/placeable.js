// @flow
import styled from './styled';
import domElements from '../utils/domElements';

import type { Target } from '../types';

const placeable = (tag: Target) => styled(tag, { allowComposition: 'layout' });

// Shorthands for all valid HTML Elements
domElements.forEach(domElement => {
  placeable[domElement] = styled(domElement, { allowComposition: 'appearance' });
});

export default placeable;
