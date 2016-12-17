/**
 * Sample ReactNative app written with styled-components
 *
 * This directly requires the source, so whichever changes you make in styled-components will
 * immediately be reflected here
 */

import React from 'react'
import {
  AppRegistry,
} from 'react-native'
import styled from '../../src/native'

const Container = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  background: ${props => props.bg};
`

const Welcome = styled.Text`
  font-size: 20;
  text-align: center;
  margin: 10;
  color: ${props => props.color};
`

const Example = () => (
  <Container bg="papayawhip">
    <Welcome color="palevioletred">
      styled-components, running on ReactNative
    </Welcome>
  </Container>
)

AppRegistry.registerComponent('example', () => Example)
