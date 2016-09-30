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
const injectSpy = expect.createSpy()
const appendRuleSpy = expect.createSpy()

class StubStylesheet {
  inject(...args) {
    injectSpy(...args)
    return {}
  }
  insert() {
    return { appendRule: (...args) => {
      appendRuleSpy(...args)
    } }
  }
}

const stubbedSheet = {
  StyleSheet: StubStylesheet,
  '@global': true,
}

let styled

describe('e2e', () => {
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    styled = proxyquire('../index', {
      '../vendor/glamor/sheet': stubbedSheet,
      './vendor/glamor/sheet': stubbedSheet,
      'glamor/lib/sheet': stubbedSheet,
    }).default
    injectSpy.reset()
    appendRuleSpy.reset()
  })

  /**
   * Tests
   */
  describe('basic', () => {
    it('should not throw an error when called', () => {
      styled.div``
    })

    it('should inject once for a new styled component when it\'s first mounted', () => {
      const Comp = styled.div``
      shallow(<Comp />)
      expect(injectSpy).toHaveBeenCalled()
    })

    // TODO Fix this
    it.skip('should not append when empty styles are passed', () => {
      const Comp = styled.div``
      shallow(<Comp />)
      expect(appendRuleSpy).toNotHaveBeenCalled()
    })

    // TODO Fix this
    it.skip('should not append when only whitespace is passed', () => {
      const Comp = styled.div`

      `
      shallow(<Comp />)
      expect(appendRuleSpy).toNotHaveBeenCalled()
    })

    it('should inject only once for a styled component, no matter how often it\'s mounted', () => {
      const Comp = styled.div``
      shallow(<Comp />)
      shallow(<Comp />)
      expect(injectSpy).toHaveBeenCalled()
      expect(injectSpy.calls.length).toEqual(1)
    })
  })

  describe('with styles', () => {
    it('should append a style', () => {
      const rule = 'color: blue;'
      const Comp = styled.div`
        ${rule}
      `
      shallow(<Comp />)
      expect(appendRuleSpy).toHaveBeenCalled()
      expect(appendRuleSpy.calls.length).toEqual(1)
      expect(appendRuleSpy.calls[0].arguments[0]).toInclude(rule)
    })

    it('should append multiple styles for one component in a single appendRule call', () => {
      const rule1 = 'color: blue;'
      const rule2 = 'background: red;'
      const Comp = styled.div`
        ${rule1}
        ${rule2}
      `
      shallow(<Comp />)
      expect(appendRuleSpy).toHaveBeenCalled()
      expect(appendRuleSpy.calls.length).toEqual(1)
      expect(appendRuleSpy.calls[0].arguments[0]).toInclude(rule1)
      expect(appendRuleSpy.calls[0].arguments[0]).toInclude(rule2)
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

      expect(appendRuleSpy).toHaveBeenCalled()
      expect(appendRuleSpy.calls.length).toEqual(2)
      expect(appendRuleSpy.calls[0].arguments[0]).toInclude(firstRule)
      expect(appendRuleSpy.calls[1].arguments[0]).toInclude(secondRule)
    })

    // TODO Fix this
    it.skip('should inject styles of multiple components based on creation, not rendering order', () => {
      const firstRule = 'background: blue;'
      const secondRule = 'background: red;'
      const FirstComp = styled.div`
        ${firstRule}
      `
      const SecondComp = styled.div`
        ${secondRule}
      `

      // Switch rendering order, shouldn't change injection order
      shallow(<SecondComp />)
      shallow(<FirstComp />)

      expect(appendRuleSpy).toHaveBeenCalled()
      expect(appendRuleSpy.calls.length).toEqual(2)
      expect(appendRuleSpy.calls[0].arguments[0]).toInclude(firstRule)
      expect(appendRuleSpy.calls[1].arguments[0]).toInclude(secondRule)
    })

    // TODO Fix this
    it.skip('should ignore a JS-style (invalid) comment in the styles', () => {
      const comment = '// This is an invalid comment'
      const rule = 'color: blue;'
      const Comp = styled.div`
        ${comment}
        ${rule}
      `
      shallow(<Comp />)
      expect(appendRuleSpy).toHaveBeenCalled()
      expect(appendRuleSpy.calls.length).toEqual(1)
      expect(appendRuleSpy.calls[0].arguments[0]).toNotInclude(comment)
      expect(appendRuleSpy.calls[0].arguments[0]).toInclude(rule)
    })
  })
})
