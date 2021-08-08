import * as secondary from './base';
/* Import singleton constructors */
import styled from './constructors/styled';

/**
 * eliminates the need to do styled.default since the other APIs
 * are directly assigned as properties to the main function
 * */
for (const key in secondary) {
  // @ts-expect-error shush
  styled[key] = secondary[key];
}

export default styled;
