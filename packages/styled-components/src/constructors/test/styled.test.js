// @flow
import styled from '../styled';
import domElements from '../../utils/domElements';

describe('styled', () => {
  it('should have all valid HTML5 elements defined as properties', () => {
    for (let i = 0; i < domElements.length; i += 1) {
      expect(styled[domElements[i]]).toBeTruthy();
    }
  });
});
