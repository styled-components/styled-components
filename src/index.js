// @flow

import ComponentStyle from './models/ComponentStyle'
import css from './constructors/css'

/* Import singleton constructors */
import _StyledComponent from './models/StyledComponent'
import _styled from './constructors/styled'
import _constructWithOptions from './constructors/constructWithOptions'

export * from './base'

/* Instantiate singletons */
const constructWithOptions = _constructWithOptions(css)
const StyledComponent = _StyledComponent(ComponentStyle)

export default _styled(StyledComponent, constructWithOptions)
