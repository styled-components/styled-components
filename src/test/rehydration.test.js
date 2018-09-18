import React from 'react'
import { shallow } from 'enzyme'

import { resetStyled, expectCSSMatches, seedNextClassnames } from './utils'

import _injectGlobal from '../constructors/injectGlobal'
import stringifyRules from '../utils/stringifyRules'
import css from '../constructors/css'
import _keyframes from '../constructors/keyframes'
import StyleSheet from '../models/StyleSheet'
import { SC_ATTR } from '../constants'

const keyframes = _keyframes(hash => `keyframe_${hash%1000}`, stringifyRules, css)
const injectGlobal = _injectGlobal(stringifyRules, css)

const getStyleTags = () => (
  Array.from(document.querySelectorAll('style')).map(el => ({
    css: el.innerHTML.trim().replace(/\s+/mg, ' ')
  }))
)

let styled

describe('rehydration', () => {
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    styled = resetStyled()
  })

  describe('with existing styled components', () => {
    beforeEach(() => {
      document.head.innerHTML = `
        <style ${SC_ATTR}="b">
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
      expectCSSMatches('.b { color: red; } .ONE { } .a { color:blue; }')
    })

    it('should reuse a componentId', () => {
      const A = styled.div.withConfig({ componentId: 'ONE' })`color: blue;`
      shallow(<A />)
      const B = styled.div.withConfig({ componentId: 'TWO' })``
      shallow(<B />)
      expectCSSMatches('.b { color: red; } .ONE { } .a { color:blue; }')
    })

    it('should reuse a componentId and generated class', () => {
      const A = styled.div.withConfig({ componentId: 'ONE' })`color: blue;`
      shallow(<A />)
      const B = styled.div.withConfig({ componentId: 'TWO' })`color: red;`
      shallow(<B />)
      expectCSSMatches('.b { color: red; } .ONE { } .a { color:blue; }')
    })

    it('should reuse a componentId and inject new classes', () => {
      const A = styled.div.withConfig({ componentId: 'ONE' })`color: blue;`
      shallow(<A />)
      const B = styled.div.withConfig({ componentId: 'TWO' })`color: red;`
      shallow(<B />)
      const C = styled.div.withConfig({ componentId: 'TWO' })`color: green;`
      shallow(<C />)
      expectCSSMatches('.b{ color: red; } .c{ color:green; } .ONE { } .a{ color:blue; }')
    })
  })

  describe('with styled components with props', () => {
    beforeEach(() => {
      /* Hash 1323611362 is based on name TWO and contents color: red.
       * Change either and this will break. */
      document.head.innerHTML = `
        <style ${SC_ATTR}='a b'>
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

    it('should preserve the styles', () => {
      expectCSSMatches(`
        .ONE { } .a { color: blue; }
        .TWO { } .b { color: red; }
      `)
    })

    it('should not inject new styles for a component already rendered', () => {
      const Comp = styled.div.withConfig({ componentId: 'ONE' })`
        color: ${ props => props.color };
      `
      shallow(<Comp color="blue"/>)
      expectCSSMatches(`
        .ONE { } .a { color: blue; }
        .TWO { } .b { color: red; }
      `)
    })

    it('should inject new styles for a new computed style of a component', () => {
      seedNextClassnames(['x'])
      const Comp = styled.div.withConfig({ componentId: 'ONE' })`
        color: ${ props => props.color };
      `
      shallow(<Comp color="green"/>)
      expectCSSMatches(`
        .a { color: blue; } .x { color:green; }
        .b { color: red; }
      `)
    })
  })

  describe('with inline styles that werent rendered by us', () => {
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
      expectCSSMatches('.TWO {} .b { color: red; } .ONE { } .a { color:blue; } .TWO {} .b { color:red; } ')
    })
  })

  describe('with global styles', () => {
    beforeEach(() => {
      /* Adding a non-local stylesheet with a hash 557410406 which is
       * derived from "body { background: papayawhip; }" so be careful
       * changing it. */
      document.head.innerHTML = `
        <style ${SC_ATTR}>
          /* sc-component-id: sc-global-557410406 */
          body { background: papayawhip; }
        </style>
        <style ${SC_ATTR}='b'>
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
      expectCSSMatches('body { background: papayawhip; } .b { color: red; } body { color:tomato; }')
    })

    it('should interleave global and local styles', () => {
      injectGlobal`
        body { color: tomato; }
      `
      const A = styled.div.withConfig({ componentId: 'ONE' })`color: blue;`
      shallow(<A />)

      expectCSSMatches('body { background: papayawhip; } .b { color: red; } body { color:tomato; } .ONE { } .a { color:blue; }')
      expect(getStyleTags()).toEqual([
        { css: '/* sc-component-id: sc-global-557410406 */ body{background:papayawhip;} ', },
        { css: '/* sc-component-id: TWO */ .b{color:red;} ', },
        { css: '/* sc-component-id: sc-global-2299393384 */ body{color:tomato;} ', },
        { css: '/* sc-component-id: ONE */ .ONE {} .a{color:blue;}', },
      ].reduce((acc, { css }) => {
        acc[0].css += css
        return acc
      }, [{ css: '' }]))
    })
  })

  describe('with all styles already rendered', () => {
    let styleTags
    beforeEach(() => {
      document.head.innerHTML = `
        <style ${SC_ATTR}>
           /* sc-component-id: sc-global-1455077013 */
          html { font-size: 16px; }
           /* sc-component-id: sc-global-557410406 */
          body { background: papayawhip; }
        </style>
        <style ${SC_ATTR}='a b'>
          /* sc-component-id: ONE */
          .ONE {}
          .a { color: blue; }
          /* sc-component-id: TWO */
          .TWO {}
          .b { color: red; }
        </style>
      `
      styleTags = Array.from(document.querySelectorAll('style'))
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

    it('should replace stylesheets on-demand', () => {
      const tagsAfterReset = Array.from(document.querySelectorAll('style'))
      expect(tagsAfterReset[0]).toBe(styleTags[0])
      expect(tagsAfterReset[1]).toBe(styleTags[1])

      /* Rerendering existing tags doesn't touch the DOM */
      const A = styled.div.withConfig({ componentId: 'ONE' })`color: blue;`
      shallow(<A />)
      const B = styled.div.withConfig({ componentId: 'TWO' })`color: red;`
      shallow(<B />)
      const styleTagsAfterRehydration = Array.from(document.querySelectorAll('style'))
      expect(styleTagsAfterRehydration[0]).toEqual(styleTags[0])

      /* Only when new components are introduced (or a previous component
       * generates a new hash) does the style tag get replaced. */
      const C = styled.div.withConfig({ componentId: 'THREE' })`color: green;`
      shallow(<C />)

      /* the order stays correct and the styles are unharmed
        * NOTE: during rehydration the empty rules are stripped out however */
      expectCSSMatches(`
        html { font-size:16px; }
        body { background:papayawhip; }
        .a { color:blue; }
        .b { color:red; }
        .THREE { } .c { color:green; }
      `)
    })

    it('should not change styles if rendered in the same order they were created with', () => {
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

    it('should still not change styles if rendered in a different order', () => {
      const B = styled.div.withConfig({ componentId: 'TWO' })`color: red;`
      shallow(<B />)
      injectGlobal`
        body { background: papayawhip; }
      `
      const A = styled.div.withConfig({ componentId: 'ONE' })`color: blue;`
      shallow(<A />)
      injectGlobal`
        html { font-size: 16px; }
      `

      expectCSSMatches(`
        html { font-size: 16px; }
        body { background: papayawhip; }
        .ONE { } .a { color: blue; }
        .TWO { } .b { color: red; }
      `)
    })
  })

  describe('with keyframes', () => {
    beforeEach(() => {
      document.head.innerHTML = `
        <style ${SC_ATTR}='keyframe_880'>
          /* sc-component-id: sc-keyframes-keyframe_880 */
          @-webkit-keyframes keyframe_880 {from {opacity: 0;}}@keyframes keyframe_880 {from {opacity: 0;}}
        </style>
      `
      StyleSheet.reset()
    })

    it('should not touch existing styles', () => {
      expectCSSMatches(`
        @-webkit-keyframes keyframe_880 {from {opacity: 0;}}@keyframes keyframe_880 {from {opacity: 0;}}
      `)
    })

    it('should not regenerate keyframes', () => {
      keyframes`
        from { opacity: 0; }
      `
      expectCSSMatches(`
        @-webkit-keyframes keyframe_880 {from {opacity: 0;}}@keyframes keyframe_880 {from {opacity: 0;}}
      `)
    })

    it('should still inject new keyframes', () => {
      keyframes`
        from { opacity: 1; }
      `
      expectCSSMatches(`
        @-webkit-keyframes keyframe_880 {from {opacity: 0;}}@keyframes keyframe_880 {from {opacity: 0;}}
        @-webkit-keyframes keyframe_144 {from {opacity:1;}}@keyframes keyframe_144 {from {opacity:1;}}
      `)
    })

    it('should pass the keyframes name along as well', () => {
      const fadeIn = keyframes`
        from { opacity: 0; }
      `
      const A = styled.div`animation: ${fadeIn} 1s both;`
      const fadeOut = keyframes`
        from { opacity: 1; }
      `
      const B = styled.div`animation: ${fadeOut} 1s both;`
      /* Purposely rendering out of order to make sure the output looks right */
      shallow(<B />)
      shallow(<A />)

      expectCSSMatches(`
        @-webkit-keyframes keyframe_880 {from {opacity: 0;}}@keyframes keyframe_880 {from {opacity: 0;}}
        .sc-a { } .d { -webkit-animation:keyframe_880 1s both; animation:keyframe_880 1s both; }
        @-webkit-keyframes keyframe_144 {from {opacity:1;}}@keyframes keyframe_144 {from {opacity:1;}}
        .sc-b { } .c { -webkit-animation:keyframe_144 1s both; animation:keyframe_144 1s both; }
      `)
    })
  })
})
