/* eslint-disable no-unused-expressions */
/**
 * This is our end-to-end test suite, which essentially makes sure our public API works the way we
 * promise/want
 */

import React from 'react'
import expect from 'expect'
import proxyquire from 'proxyquire'
import { shallow } from 'enzyme'

/**
 * Setup
 */

let styleSheet
let styled

class StubStylesheet {
  constructor() {
    // TODO: there must be a better way to get a handle on the instance each time
    // For the tests so far, the first stylesheet to be created is the good one
    // TODO: fix GlobalStyle.js
    if (!styleSheet) styleSheet = this
    this.injected = false
    this.rules = []
  }
  inject() {
    this.injected = true
  }

  insert(string) {
    const rule = string ? [string] : []
    this.rules.push(rule)
    return { appendRule: css => rule.push(css) }
  }

  toCSS() {
    return this.rules.map(r => r.join('\n')).join('\n')
  }
}

const stubbedSheet = {
  StyleSheet: StubStylesheet,
  '@global': true,
}

/* Ignore hashing, just return class names sequentially as .a .b .c etc */
let index = 0
const classNames = code => {
  const lastLetter = String.fromCodePoint(97 + code)
  return code > 26 ? `${classNames(Math.floor(code / 26))}${lastLetter}` : lastLetter
}
const stubbedEmoji = () => classNames(index++) // eslint-disable-line no-plusplus
stubbedEmoji['@global'] = true

describe('e2e', () => {
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    styleSheet = null
    index = 0
    styled = proxyquire('../index', {
      '../vendor/glamor/sheet': stubbedSheet,
      '../utils/toEmoji': stubbedEmoji,
    }).default
  })

  /**
   * Tests
   */
  describe('basic', () => {
    it('should not throw an error when called', () => {
      styled.div``
    })

    it('should inject a stylesheet when a component is created', () => {
      const Comp = styled.div``
      shallow(<Comp />)
      expect(styleSheet.injected).toBe(true)
    })

    it('should not generate any styles by default', () => {
      styled.div``
      expect(styleSheet.toCSS()).toEqual('')
    })

    it('should generate an empty tag once rendered', () => {
      const Comp = styled.div``
      shallow(<Comp />)
      expect(styleSheet.toCSS()).toEqual('.a {  }')
    })

    /* TODO: we should probably pretty-format the output so this test might have to change */
    it('should pass through all whitespace', () => {
      const Comp = styled.div`   \n   `
      shallow(<Comp />)
      expect(styleSheet.toCSS()).toEqual('.a {    \n    }')
    })

    it('should inject only once for a styled component, no matter how often it\'s mounted', () => {
      const Comp = styled.div``
      shallow(<Comp />)
      shallow(<Comp />)
      expect(styleSheet.toCSS()).toEqual('.a {  }')
    })
  })

  describe('with styles', () => {
    it('should append a style', () => {
      const rule = 'color: blue;'
      const Comp = styled.div`
        ${rule}
      `
      shallow(<Comp />)
      expect(styleSheet.toCSS().replace(/\s+/g, ' ')).toEqual('.a { color: blue; }')
    })

    it('should append multiple styles', () => {
      const rule1 = 'color: blue;'
      const rule2 = 'background: red;'
      const Comp = styled.div`
        ${rule1}
        ${rule2}
      `
      shallow(<Comp />)
      expect(styleSheet.toCSS().replace(/\s+/g, ' ')).toEqual('.a { color: blue; background: red; }')
    })

    it('should inject styles of multiple components', () => {
      const firstRule = 'background: blue;'
      const secondRule = 'background: red;'
      const FirstComp = styled.div`
        ${firstRule}
      `
      const SecondComp = styled.div`
        ${secondRule}
      `

      shallow(<FirstComp />)
      shallow(<SecondComp />)

      expect(styleSheet.toCSS().replace(/\s+/g, ' ')).toEqual('.a { background: blue; } .b { background: red; }')
    })

    it('should inject styles of multiple components based on creation, not rendering order', () => {
      const firstRule = 'content: "first rule";'
      const secondRule = 'content: "second rule";'
      const FirstComp = styled.div`
        ${firstRule}
      `
      const SecondComp = styled.div`
        ${secondRule}
      `

      // Switch rendering order, shouldn't change injection order
      shallow(<SecondComp />)
      shallow(<FirstComp />)

      // Classes _do_ get generated in the order of rendering but that's ok
      expect(styleSheet.toCSS().replace(/\s+/g, ' ')).toEqual(`
        .b { content: "first rule"; }
        .a { content: "second rule"; }
      `.trim().replace(/\s+/g, ' '))
    })

    it('should ignore a JS-style (invalid) comment in the styles', () => {
      const comment = '// This is an invalid comment'
      const rule = 'color: blue;'
      const Comp = styled.div`
        ${comment}
        ${rule}
      `
      shallow(<Comp />)
      expect(styleSheet.toCSS().replace(/\s+/g, ' ')).toEqual(`
        .a {
          // This is an invalid comment ${''/* TODO: this probably should be stripped */}
          color: blue;
        }
      `.trim().replace(/\s+/g, ' '))
    })
  })
})
