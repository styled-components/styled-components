// @flow
import React from 'react'
import { View } from 'react-native' // eslint-disable-line
import { create as render } from 'react-test-renderer'
import styled, { resetStyleCache } from '../../src/native'


export default {
  'simple component': () => {
    resetStyleCache()

    const Component = styled(View)`
      color: red;
    `

    render(<Component />)
  },

  'prop changes': () => {
    resetStyleCache()

    const Component = styled(View)`
      color: ${props => (props.danger ? 'red' : 'black')};
    `

    const instance = render(<Component />)
    instance.update(<Component danger />)
    instance.update(<Component />)
    instance.update(<Component danger />)
    instance.update(<Component />)
    instance.update(<Component danger />)
    instance.update(<Component />)
    instance.update(<Component danger />)
  },

  'prop shorthands': () => {
    resetStyleCache()

    const Component = styled(View)`
      color: red;
      flex: 1;
      font: bold 12px/14px "Helvetica";
      margin: 1px 2px;
      padding: 3px 4px;
      border: 1px solid black;
    `

    render(<Component />)
  },

  'prop shorthands with prop changes': () => {
    resetStyleCache()

    const Component = styled(View)`
      color: ${props => (props.danger ? 'red' : 'black')};
      flex: 1;
      font: bold 12px/14px "Helvetica";
      margin: 1px 2px;
      padding: 3px 4px;
      border: 1px solid black;
    `

    const instance = render(<Component />)
    instance.update(<Component danger />)
    instance.update(<Component />)
    instance.update(<Component danger />)
    instance.update(<Component />)
    instance.update(<Component danger />)
    instance.update(<Component />)
    instance.update(<Component danger />)
  },
}
