// @flow
import * as secondary from './base';

/* Import singleton constructors */
import styled from './constructors/styled';

/**
 * eliminates the need to do styled.default since the other APIs
 * are directly assigned as properties to the main function
 * */
// eslint-disable-next-line guard-for-in
for (const key in secondary) {
  styled[key] = secondary[key];
}

export default styled;
