// @flow
import * as secondary from './base';

/* Import singleton constructors */
import placeable from './constructors/placeable';
import styleable from './constructors/styleable';
import fixed from './constructors/fixed';

const main = {
  placeable,
  styleable,
  fixed,
};
/**
 * eliminates the need to do styled.default since the other APIs
 * are directly assigned as properties to the main function
 * */
// eslint-disable-next-line guard-for-in
for (const key in secondary) {
  main[key] = secondary[key];
}

export default main;
