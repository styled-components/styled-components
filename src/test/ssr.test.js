import React, { Component } from 'react'
import { shallow, mount } from 'enzyme'

import { resetStyled, expectCSSMatches } from './utils'
import StyleSheet from '../models/BrowserStyleSheet'

let styled

describe('ssr', () => {
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    styled = resetStyled()
  })

  describe('rehydtration with existing styled components', () => {
    beforeEach(() => {
      /* Hash is based on name TWO and contents color: red.
       * Change either and this will break. */
      document.head.innerHTML = `
        <style data-styled-components-hashes='1323611362:foo'
               data-styled-components-is-local='true'>
          /* sc-component-id: TWO */
          .TWO {}
          .foo { color: red; }
        </style>
      `
      StyleSheet.reset()
    })

    it('should preserve the styles', () => {
      expectCSSMatches('.TWO {} .foo { color: red; }')
    })

    it('should append a new component like normal', () => {
      const Comp = styled.div.withConfig({ componentId: 'ONE' })`
        color: blue;
      `
      shallow(<Comp />)
      expectCSSMatches('.TWO {} .foo { color: red; } .ONE { } .a { color: blue; }')
    })

    it('should reuse a componentId', () => {
      const A = styled.div.withConfig({ componentId: 'ONE' })`color: blue;`
      shallow(<A />)
      const B = styled.div.withConfig({ componentId: 'TWO' })``
      shallow(<B />)
      expectCSSMatches('.TWO {} .foo { color: red; } .ONE { } .a { color: blue; }')
    })

    it('should reuse a componentId and generated class', () => {
      const A = styled.div.withConfig({ componentId: 'ONE' })`color: blue;`
      shallow(<A />)
      const B = styled.div.withConfig({ componentId: 'TWO' })`color: red;`
      shallow(<B />)
      expectCSSMatches('.TWO {} .foo { color: red; } .ONE { } .a { color: blue; }')
    })

    it('should reuse a componentId and inject new classes', () => {
      const A = styled.div.withConfig({ componentId: 'ONE' })`color: blue;`
      shallow(<A />)
      const B = styled.div.withConfig({ componentId: 'TWO' })`color: green;`
      shallow(<B />)
      expectCSSMatches('.TWO {} .foo { color: red; } .b { color: green; } .ONE { } .a { color: blue; }')
    })
  })
})
