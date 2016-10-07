import expect from 'expect'
import proxyquire from 'proxyquire'
import keyframes from '../keyframes'

const KEYFRAMES_REGEX = /@keyframes\s*(\S+)\s*\{/

const hasValidKeyframesDeclaration = (str) => KEYFRAMES_REGEX.test(str)
const getKeyframesNameFromCSS = (str) => str.match(KEYFRAMES_REGEX)[1]

/**
 * Setup
 */
const insertSpy = expect.createSpy()

class StubStylesheet {
  inject() {}
  insert(...args) {
    insertSpy(...args)
  }
 }

const stubbedSheet = {
  StyleSheet: StubStylesheet,
  '@global': true,
}

const stubbedKeyframes = proxyquire('../keyframes', {
  '../vendor/glamor/sheet': stubbedSheet,
})

describe('keyframes', () => {
  beforeEach(() => {
    insertSpy.reset()
  })

  it('should return its name', () => {
    expect(keyframes`
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `).toBeA('string')
  })

  it('should insert the correct styles', () => {
    const rules = `
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `

    const name = stubbedKeyframes`${rules}`

    expect(insertSpy).toHaveBeenCalled()
    expect(insertSpy.calls.length).toEqual(1)
    expect(
      hasValidKeyframesDeclaration(insertSpy.calls[0].arguments[0])
    ).toEqual(true)
    expect(
      getKeyframesNameFromCSS(insertSpy.calls[0].arguments[0])
    ).toEqual(name)
    expect(insertSpy.calls[0].arguments[0]).toInclude(rules)
  })
})
