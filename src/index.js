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

export * from './base'

/* Instantiate singletons */
const ComponentStyle = _ComponentStyle(
  generateAlphabeticName,
  flatten,
  stringifyRules
)
const constructWithOptions = _constructWithOptions(css)
const StyledComponent = _StyledComponent(ComponentStyle)

export default _styled(StyledComponent, constructWithOptions)
