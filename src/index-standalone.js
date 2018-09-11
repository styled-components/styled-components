// @flow

import constructWithOptions from './constructors/constructWithOptions'
import StyledComponent from './models/StyledComponent'
import * as secondary from './base'

/* Import singleton constructors */
import _styled from './constructors/styled'

/* Instantiate singletons */
const styled = _styled(StyledComponent, constructWithOptions)

/**
 * eliminates the need to do styled.default since the other APIs
 * are directly assigned as properties to the main function
 * */
// eslint-disable-next-line guard-for-in
for (const key in secondary) {
  styled[key] = secondary[key]
}

export default styled
