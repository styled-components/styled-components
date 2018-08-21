// @flow

/* Import singletons */
import flatten from './utils/flatten'
import stringifyRules from './utils/stringifyRules'
import generateAlphabeticName from './utils/generateAlphabeticName'
import css from './constructors/css'

/* Import singleton constructors */
import _StyledComponent from './models/StyledComponent'
import _ComponentStyle from './models/ComponentStyle'
import _styled from './constructors/styled'
import _constructWithOptions from './constructors/constructWithOptions'

import * as secondary from './base'

/* Instantiate singletons */
const ComponentStyle = _ComponentStyle(
  generateAlphabeticName,
  flatten,
  stringifyRules
)

const constructWithOptions = _constructWithOptions(css)
const StyledComponent = _StyledComponent(ComponentStyle)

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
