// @flow
import hasThemeReferences from '../hasThemeReferences';

describe(`hasThemeReferences`, () => {
  describe(`if 'rules' have only strings`, () => {
    it(`should return 'false'`, () => {
      expect(hasThemeReferences(['font-size: 1rem;'])).toBe(false);
    });
  });

  describe(`if 'rules' have at least one function`, () => {
    it(`if 'rules' has a function that references 'theme', should return 'true'`, () => {
      // expect(hasThemeReferences(['font-size: 1rem;', 'function (props) { return css`color: ${props.theme.color};` }'])).toBe(true);
    });

    it(`if 'rules' DOES NOT have a function that references 'theme', should return 'false'`, () => {
      expect(
        hasThemeReferences([
          'font-size: 1rem;',
          'display: ${props => props.display ? "block" : "none"};',
        ])
      ).toBe(false);
    });
  });
});
