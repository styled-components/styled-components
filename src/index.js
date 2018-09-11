// @flow
import constructWithOptions from './constructors/constructWithOptions'
import StyledComponent from './models/StyledComponent'

/* Import singleton constructors */
import _styled from './constructors/styled'

export * from './base'
export default _styled(StyledComponent, constructWithOptions)
