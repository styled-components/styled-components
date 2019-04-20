// @flow

/**
 * @todo could do the same for `compress`
 */
describe('stringifyRules', () => {
  afterAll(() => {
    delete process.env.STYLIS_SHOULD_PREFIX
  })
  describe('prefixes', () => {
    it('should stringify with prefixes by default', () => {
      jest.resetModules()
      const stringifyRules = require('../stringifyRules').default

      const [stringifiedSelect] = stringifyRules([`user-select: none;`], '');
      expect(stringifiedSelect).toContain('-webkit-user-select');
      expect(stringifiedSelect).toContain('-moz-user-select');
      expect(stringifiedSelect).toContain('user-select:none;');

      const [stringifiedDisplayFlex] = stringifyRules([`display: flex;`], '');
      expect(stringifiedDisplayFlex).toContain('-webkit-box');
      expect(stringifiedDisplayFlex).toContain('-webkit-flex');
      expect(stringifiedDisplayFlex).toContain('-ms-flexbox');
      expect(stringifiedDisplayFlex).toContain('display:flex;');
    });

    it('should stringify without prefixes if the env is set', () => {
      jest.resetModules()
      process.env.STYLIS_SHOULD_PREFIX = 'true'
      const stringifyRules = require('../stringifyRules').default

      const [stringifiedSelect] = stringifyRules([`user-select: none;`], '');
      expect(stringifiedSelect).not.toContain('-moz-user-select');
      expect(stringifiedSelect).toEqual('{user-select:none;}');

      const [stringifiedDisplayFlex] = stringifyRules([`display: flex;`], '');
      expect(stringifiedDisplayFlex).not.toContain('-webkit-box');
      expect(stringifiedDisplayFlex).toEqual('{display:flex;}');
    });
  });
});
