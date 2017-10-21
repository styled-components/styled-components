import React from 'react'
import macro from '../../../../macro'

class Test extends React.Component {
  render() {
    return React.createElement('div', null, 'Hello World')
  }
}
const StyledTest = macro(Test)`
  background: ${props => props.theme.background};
  color: red;
`

export default StyledTest
