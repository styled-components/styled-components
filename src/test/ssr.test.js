import React, { Component } from 'react'
import { shallow, mount } from 'enzyme'

import { resetStyled, expectCSSMatches } from './utils'
import StyleSheet from '../models/BrowserStyleSheet'

import _injectGlobal from '../constructors/injectGlobal'
import stringifyRules from '../utils/stringifyRules'
import css from '../constructors/css'
const injectGlobal = _injectGlobal(stringifyRules, css)

let styled

const getStyleTags = () => (
  Array.from(document.querySelectorAll('style')).map(el => ({
    isLocal: el.getAttribute('data-styled-components-is-local'),
    css: el.innerHTML.trim().replace(/\s+/mg, ' ')
  }))
)

describe('ssr', () => {
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    styled = resetStyled()
  })

  describe('rehydtration with existing styled components', () => {
    beforeEach(() => {
      /* Hash 1323611362 is based on name TWO and contents color: red.
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

  describe('with other rendered styles', () => {
    beforeEach(() => {
      /* Same css as before, but without the data attributes we ignore it */
      document.head.innerHTML = `
        <style>
          /* sc-component-id: TWO */
          .TWO {}
          .foo { color: red; }
        </style>
      `
      StyleSheet.reset()
    })

    it('should leave the existing styles there', () => {
      expectCSSMatches('.TWO {} .foo { color: red; }')
    })

    it('should generate new classes, even if they have the same name', () => {
      const A = styled.div.withConfig({ componentId: 'ONE' })`color: blue;`
      shallow(<A />)
      const B = styled.div.withConfig({ componentId: 'TWO' })`color: red;`
      shallow(<B />)
      expectCSSMatches('.TWO {} .foo { color: red; } .ONE { } .a { color: blue; } .TWO {} .b { color: red; } ')
    })
  })

  describe('with global styles', () => {
    beforeEach(() => {
      /* Adding a non-local stylesheet with a hash 557410406 which, again,
       * is derived from "body { background: papayawhip; }" so be careful
       * changing it. */
      document.head.innerHTML = `
        <style data-styled-components-hashes='557410406:557410406'
               data-styled-components-is-local='false'>
          body { background: papayawhip; }
        </style>
        <style data-styled-components-hashes='1323611362:foo'
               data-styled-components-is-local='true'>
          /* sc-component-id: TWO */
          .TWO {}
          .foo { color: red; }
        </style>
      `
      StyleSheet.reset()
    })

    it('should leave the existing styles there', () => {
      expectCSSMatches('body { background: papayawhip; } .TWO {} .foo { color: red; }')
    })

    it('should inject new global styles at the end', () => {
      injectGlobal`
        body { color: tomato; }
      `
      expectCSSMatches('body { background: papayawhip; } .TWO {} .foo { color: red; } body { color: tomato; }')

      expect(getStyleTags()).toEqual([
        { isLocal: 'false', css: 'body { background: papayawhip; }', },
        { isLocal: 'true', css: '/* sc-component-id: TWO */ .TWO {} .foo { color: red; }', },
        { isLocal: 'false', css: '/* sc-component-id: sc-global-2299393384 */ body {color: tomato;}', },
      ])
    })

    it('should interleave global and local styles', () => {
      injectGlobal`
        body { color: tomato; }
      `
      const A = styled.div.withConfig({ componentId: 'ONE' })`color: blue;`
      shallow(<A />)

      expectCSSMatches('body { background: papayawhip; } .TWO {} .foo { color: red; } body { color: tomato; } .ONE { } .a { color: blue; }')
      expect(getStyleTags()).toEqual([
        { isLocal: 'false', css: 'body { background: papayawhip; }', },
        { isLocal: 'true', css: '/* sc-component-id: TWO */ .TWO {} .foo { color: red; }', },
        { isLocal: 'false', css: '/* sc-component-id: sc-global-2299393384 */ body {color: tomato;}', },
        { isLocal: 'true', css: '/* sc-component-id: ONE */ .ONE {} .a {color: blue;}', },
      ])
    })
  })
})
