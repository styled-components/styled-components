// @flow

import { SC_ATTR, SC_ATTR_ACTIVE, SC_ATTR_MODE, SC_ATTR_VERSION } from '../../constants';
import { makeStyleTag } from '../dom';

describe('makeStyleTag', () => {
  it('creates a style element with the SC attributes', () => {
    const element = makeStyleTag(true);

    expect(element.tagName).toBe('STYLE');
    expect(element.getAttribute(SC_ATTR)).toBe(SC_ATTR_ACTIVE);
    expect(element.getAttribute(SC_ATTR_MODE)).toBe('cssom');
    expect(element.hasAttribute(SC_ATTR_VERSION)).toBeTruthy();
  });

  it('inserts the element after all previously created ones', () => {
    const target = document.createElement('div');

    target.innerHTML = `
      <style data-index="1" ${SC_ATTR}></style>
      <div></div>
      <style data-index="2" ${SC_ATTR}></style>
      <div></div>
      <style data-index="3"></style>
    `;

    const element = makeStyleTag(true, target);
    const children = target.querySelectorAll('style');

    expect(element.tagName).toBe('STYLE');
    expect(children.length).toBe(4);
    expect(children[0].getAttribute('data-index')).toBe('1');
    expect(children[1].getAttribute('data-index')).toBe('2');
    expect(children[2]).toBe(element);
    expect(children[3].getAttribute('data-index')).toBe('3');
  });

  it('adds an attribute when not using CSSOM injection mode', () => {
    const element = makeStyleTag(false);

    expect(element.tagName).toBe('STYLE');
    expect(element.getAttribute(SC_ATTR)).toBe(SC_ATTR_ACTIVE);
    expect(element.getAttribute(SC_ATTR_MODE)).toBe('text');
    expect(element.hasAttribute(SC_ATTR_VERSION)).toBeTruthy();
  });
});
