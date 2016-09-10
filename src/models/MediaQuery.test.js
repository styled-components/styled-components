import expect from 'expect'
import MediaQuery from './MediaQuery'

describe('MediaQuery', () => {
  describe('#fullQuery', () => {
    it('should add brackets to a simple example', () => {
      const mediaQuery = new MediaQuery('min-width: 500px')
      expect(mediaQuery.fullQuery()).toEqual('@media (min-width: 500px)')
    })
    it('should not add brackets to a simple example with brackets', () => {
      const mediaQuery = new MediaQuery('(min-width: 500px)')
      expect(mediaQuery.fullQuery()).toEqual('@media (min-width: 500px)')
    })
    it('should add brackets to a weird double example', () => {
      const mediaQuery = new MediaQuery('min-width: 500px) and (max-width: 1000px')
      expect(mediaQuery.fullQuery()).toEqual('@media (min-width: 500px) and (max-width: 1000px)')
    })
    it('should not add brackets to a normal double example', () => {
      const mediaQuery = new MediaQuery('(min-width: 500px) and (max-width: 1000px)')
      expect(mediaQuery.fullQuery()).toEqual('@media (min-width: 500px) and (max-width: 1000px)')
    })
    it('should be ok if screen is used', () => {
      const mediaQuery = new MediaQuery('screen and (min-width: 500px)')
      expect(mediaQuery.fullQuery()).toEqual('@media screen and (min-width: 500px)')
    })
    it('should be ok if print is used', () => {
      const mediaQuery = new MediaQuery('print and (min-width: 500px)')
      expect(mediaQuery.fullQuery()).toEqual('@media print and (min-width: 500px)')
    })
    it("should happily return invalid syntax if that's what you give it", () => {
      const mediaQuery = new MediaQuery('screen and min-width: 500px')
      expect(mediaQuery.fullQuery()).toEqual('@media (screen and min-width: 500px)')
    })
  })
})
