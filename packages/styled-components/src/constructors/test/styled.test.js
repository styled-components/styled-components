// @flow
import { styled } from "..";
import { domElements } from '../../utils';

describe('styled', () => {
  it('should have all valid HTML5 elements defined as properties', () => {
    domElements.forEach(domElement => {
      expect(styled[domElement]).toBeTruthy();
    });
  });
});
