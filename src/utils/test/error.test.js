import StyledError from '../error'

describe('development', () => {
  it('returns a rich error', () => {
    expect(() => {
      throw new StyledError(2)
    }).toThrowErrorMatchingSnapshot()
  })

  it('allows interpolation', () => {
    expect(() => {
      throw new StyledError(1, 'foo')
    }).toThrowErrorMatchingSnapshot()
  })
})

describe('production', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production'
  })

  it('returns an error link', () => {
    expect(() => {
      throw new StyledError(2)
    }).toThrowErrorMatchingSnapshot()
  })

  it('returns an error link with interpolations if given', () => {
    expect(() => {
      throw new StyledError(1, 'foo')
    }).toThrowErrorMatchingSnapshot()
  })
})
