// @flow

import React from 'react'
import { mount } from 'enzyme'

import styled from '../../index'
import BrowserStyleSheet from '../BrowserStyleSheet'
import StyleSheetManager from '../StyleSheetManager'
import { expectCSSMatches, resetStyled } from '../../test/utils'

describe('BrowserStyleSheet', () => {
  it('should render styles in correct order when styled(StyledComponent) and StyleSheetManager is used', () => {
    const Red = styled.div`
      color: red;
    `

    const RedChangedToBlue = styled(Red)`
      color: blue;
    `

    const sheet = BrowserStyleSheet.create()

    const App = () =>
      <StyleSheetManager sheet={sheet}>
        <RedChangedToBlue>I should be blue</RedChangedToBlue>
      </StyleSheetManager>

    // $FlowFixMe
    const attachPoint = document.body.appendChild(document.createElement('div'))
    mount(<App />, { attachTo: attachPoint })

    // window.getComputedStyles would be perfect, but it seems that JSDOM
    // implementation of that function isn't complete, so need to work around
    // it.
    // $FlowFixMe
    const source = document.documentElement.outerHTML

    // regex in case test is run against minified CSS in the future
    const indexOfRedStyle = source.search('color: red')
    const indexOfBlueStyle = source.search('color: blue')
    expect(indexOfRedStyle).toBeGreaterThanOrEqual(0)
    expect(indexOfBlueStyle).toBeGreaterThanOrEqual(0)
    expect(indexOfBlueStyle).toBeGreaterThan(indexOfRedStyle)
  })
})
