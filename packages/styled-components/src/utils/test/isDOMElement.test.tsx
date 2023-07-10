import React from 'react';
import domElements from '../domElements';
import isDOMElement from '../isDOMElement';

const Comp = () => {
  return <div>My component</div>;
};

describe('isDOMElement(something)', () => {
  it('returns true if its a DOM element', () => {
    domElements.forEach(element => {
      expect(isDOMElement(element)).toBe(true);
    });
  });

  it('returns false if not', () => {
    expect(isDOMElement('customtag')).toBe(false);
    expect(isDOMElement({})).toBe(false);
    expect(isDOMElement(Comp)).toBe(false);
    expect(isDOMElement([])).toBe(false);
  });
});
