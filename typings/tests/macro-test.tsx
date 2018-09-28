import * as React from 'react'
import styled from '../../macro'

const StyledDiv = styled.div`
  background-color: papayawhip;
`

const StyledSpan = styled.span`
  color: palevioletred;
`

class MyReactNativeComponent extends React.Component<{}, {}> {
  render() {
    return (
      <StyledDiv>
        <StyledSpan>Hello World!</StyledSpan>
      </StyledDiv>
    )
  }
}
