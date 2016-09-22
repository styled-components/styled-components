import expect from 'expect'
import proxyquire from 'proxyquire'

/**
 * @author https://github.com/defunctzombie
 * @author https://github.com/broofa
 * @see https://github.com/broofa/node-uuid/issues/41
 */
function isUUID(str: string): boolean {
  return /[0-9a-f]{22}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(str)
}

// Inject FakeRoot into the "import '../models/Root'" call in keyframes.js with proxyquire
const injectStylesSpy = expect.createSpy()
const generatedClassname = 'generated-classname'
class FakeRoot {
  injectStyles() {
    injectStylesSpy()
    return generatedClassname
  }
}
const keyframes = proxyquire('../keyframes', { '../models/Root': FakeRoot })

describe('keyframes', () => {
  afterEach(() => {
    injectStylesSpy.restore()
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

  it('should use a UUID as the name', () => {
    expect(isUUID(keyframes``)).toBe(true)
  })

  it('should inject styles when called', () => {
    keyframes`` // eslint-disable-line no-unused-expressions
    expect(injectStylesSpy).toHaveBeenCalled()
  })
})
