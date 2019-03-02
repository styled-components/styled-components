// @flow
import constructWithOptions from './constructWithOptions';
import StyledComponent from '../models/StyledComponent';

import type { Target } from '../types';

const styled = (tag: Target, options: Object) =>
  constructWithOptions(StyledComponent, tag, options);
export default styled;
