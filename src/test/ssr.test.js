import React, { Component } from 'react'
import { shallow, mount } from 'enzyme'

import { resetStyled, expectCSSMatches } from './utils'
import StyleSheet, { SC_ATTR, LOCAL_ATTR } from '../models/BrowserStyleSheet'

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
        <style ${SC_ATTR}='b' ${LOCAL_ATTR}='true'>
          /* sc-component-id: TWO */
          .TWO {}
          .b { color: red; }
        </style>
      `
      StyleSheet.reset()
    })

    it('should preserve the styles', () => {
      expectCSSMatches('.TWO {} .b { color: red; }')
    })

    it('should append a new component like normal', () => {
      const Comp = styled.div.withConfig({ componentId: 'ONE' })`
        color: blue;
      `
      shallow(<Comp />)
      expectCSSMatches('.TWO {} .b { color: red; } .ONE { } .a { color: blue; }')
    })

    it('should reuse a componentId', () => {
      const A = styled.div.withConfig({ componentId: 'ONE' })`color: blue;`
      shallow(<A />)
      const B = styled.div.withConfig({ componentId: 'TWO' })``
      shallow(<B />)
      expectCSSMatches('.TWO {} .b { color: red; } .ONE { } .a { color: blue; }')
    })

    it('should reuse a componentId and generated class', () => {
      const A = styled.div.withConfig({ componentId: 'ONE' })`color: blue;`
      shallow(<A />)
      const B = styled.div.withConfig({ componentId: 'TWO' })`color: red;`
      shallow(<B />)
      expectCSSMatches('.TWO {} .b { color: red; } .ONE { } .a { color: blue; }')
    })

    it('should reuse a componentId and inject new classes', () => {
      const A = styled.div.withConfig({ componentId: 'ONE' })`color: blue;`
      shallow(<A />)
      const B = styled.div.withConfig({ componentId: 'TWO' })`color: red;`
      shallow(<B />)
      const C = styled.div.withConfig({ componentId: 'TWO' })`color: green;`
      shallow(<C />)
      expectCSSMatches('.TWO {} .b { color: red; } .c { color: green; } .ONE { } .a { color: blue; }')
    })
  })

  describe('with other rendered styles', () => {
    beforeEach(() => {
      /* Same css as before, but without the data attributes we ignore it */
      document.head.innerHTML = `
        <style>
          /* sc-component-id: TWO */
          .TWO {}
          .b { color: red; }
        </style>
      `
      StyleSheet.reset()
    })

    it('should leave the existing styles there', () => {
      expectCSSMatches('.TWO {} .b { color: red; }')
    })

    it('should generate new classes, even if they have the same name', () => {
      const A = styled.div.withConfig({ componentId: 'ONE' })`color: blue;`
      shallow(<A />)
      const B = styled.div.withConfig({ componentId: 'TWO' })`color: red;`
      shallow(<B />)
      expectCSSMatches('.TWO {} .b { color: red; } .ONE { } .a { color: blue; } .TWO {} .b { color: red; } ')
    })
  })

  describe('with global styles', () => {
    beforeEach(() => {
      /* Adding a non-local stylesheet with a hash 557410406 which is
       * derived from "body { background: papayawhip; }" so be careful
       * changing it. */
      document.head.innerHTML = `
        <style ${SC_ATTR} ${LOCAL_ATTR}='false'>
          /* sc-component-id: sc-global-557410406 */
          body { background: papayawhip; }
        </style>
        <style ${SC_ATTR}='b' ${LOCAL_ATTR}='true'>
          /* sc-component-id: TWO */
          .TWO {}
          .b { color: red; }
        </style>
      `
      StyleSheet.reset()
    })

    it('should leave the existing styles there', () => {
      expectCSSMatches('body { background: papayawhip; } .TWO {} .b { color: red; }')
    })

    it('should inject new global styles at the end', () => {
      injectGlobal`
        body { color: tomato; }
      `
      expectCSSMatches('body { background: papayawhip; } .TWO {} .b { color: red; } body { color: tomato; }')

      expect(getStyleTags()).toEqual([
        { isLocal: 'false', css: '/* sc-component-id: sc-global-557410406 */ body { background: papayawhip; }', },
        { isLocal: 'true', css: '/* sc-component-id: TWO */ .TWO {} .b { color: red; }', },
        { isLocal: 'false', css: '/* sc-component-id: sc-global-2299393384 */ body {color: tomato;}', },
      ])
    })

    it('should interleave global and local styles', () => {
      injectGlobal`
        body { color: tomato; }
      `
      const A = styled.div.withConfig({ componentId: 'ONE' })`color: blue;`
      shallow(<A />)

      expectCSSMatches('body { background: papayawhip; } .TWO {} .b { color: red; } body { color: tomato; } .ONE { } .a { color: blue; }')
      expect(getStyleTags()).toEqual([
        { isLocal: 'false', css: '/* sc-component-id: sc-global-557410406 */ body { background: papayawhip; }', },
        { isLocal: 'true', css: '/* sc-component-id: TWO */ .TWO {} .b { color: red; }', },
        { isLocal: 'false', css: '/* sc-component-id: sc-global-2299393384 */ body {color: tomato;}', },
        { isLocal: 'true', css: '/* sc-component-id: ONE */ .ONE {} .a {color: blue;}', },
      ])
    })
  })

  describe('with all styles already rendered', () => {
    beforeEach(() => {
      document.head.innerHTML = `
        <style ${SC_ATTR} ${LOCAL_ATTR}='false'>
           /* sc-component-id: sc-global-1455077013 */
          html { font-size: 16px; }
           /* sc-component-id: sc-global-557410406 */
          body { background: papayawhip; }
        </style>
        <style ${SC_ATTR}='a b' ${LOCAL_ATTR}='true'>
          /* sc-component-id: ONE */
          .ONE {}
          .a { color: blue; }
          /* sc-component-id: TWO */
          .TWO {}
          .b { color: red; }
        </style>
      `
      StyleSheet.reset()
    })

    it('should not touch existing styles', () => {
      expectCSSMatches(`
        html { font-size: 16px; }
        body { background: papayawhip; }
        .ONE { } .a { color: blue; }
        .TWO { } .b { color: red; }
      `)
    })

    it('should leave styles if rendered in the same order they were created with', () => {
      injectGlobal`
        html { font-size: 16px; }
      `
      injectGlobal`
        body { background: papayawhip; }
      `
      const A = styled.div.withConfig({ componentId: 'ONE' })`color: blue;`
      shallow(<A />)
      const B = styled.div.withConfig({ componentId: 'TWO' })`color: red;`
      shallow(<B />)

      expectCSSMatches(`
        html { font-size: 16px; }
        body { background: papayawhip; }
        .ONE { } .a { color: blue; }
        .TWO { } .b { color: red; }
      `)
    })
  })
})
