// @flow
import ComponentStyle from './models/ComponentStyle'
import constructWithOptions from './constructors/constructWithOptions'

/* Import singleton constructors */
import _StyledComponent from './models/StyledComponent'
import _styled from './constructors/styled'

export * from './base'

/* Instantiate singletons */
const StyledComponent = _StyledComponent(ComponentStyle)

export default _styled(StyledComponent, constructWithOptions)
