// @flow
/* Import singleton constructors */
import pa from './constructors/placeable';
import sa from './constructors/styleable';
import fi from './constructors/fixed';

export * from './base';

export const placeable = pa;
export const styleable = sa;
export const fixed = fi;

export default sa;
