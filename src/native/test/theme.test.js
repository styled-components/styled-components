// @flow
import React from 'react'
import TestRenderer from 'react-test-renderer'

import styled from '../index'
import ThemeProvider from '../../models/ThemeProvider'
import withTheme from '../../hoc/withTheme'

describe('withTheme', () => {
  it('should set innerRef instead of ref for stateless function components when rendered by a functional component that forwards props', () => {
    const Component = props => <div />

    const ThemedComponent = withTheme(Component)

    const WrapperComponent = props => <ThemedComponent {...props} />

    const StyledComponent = styled(WrapperComponent)``

    const wrapper = TestRenderer.create(
      <ThemeProvider theme={{}}>
        <StyledComponent />
      </ThemeProvider>
    )
    expect(
      wrapper.root.findByType(Component).props.innerRef
    ).not.toBeUndefined()
  })
})
