// @flow
import placeable from '../placeable';
import domElements from '../../utils/domElements';

describe('styled', () => {
  it('should have all valid HTML5 elements defined as properties', () => {
    domElements.forEach(domElement => {
      expect(placeable[domElement]).toBeTruthy();
    });
  });
});
