import { C } from 'ts-toolbelt';
import { SC_ATTR, SC_ATTR_ACTIVE, SC_ATTR_VERSION } from '../../constants';
import { CSSOMTag, VirtualTag } from '../Tag';
import { getSheet, makeStyleTag } from '../dom';
import { Tag } from '../types';

describe('DOM helpers', () => {
  describe('makeStyleTag', () => {
    it('creates a style element with the SC attributes', () => {
      const element = makeStyleTag();

      expect(element.tagName).toBe('STYLE');
      expect(element.getAttribute(SC_ATTR)).toBe(SC_ATTR_ACTIVE);
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

      const element = makeStyleTag(target);
      const children = target.querySelectorAll('style');

      expect(element.tagName).toBe('STYLE');
      expect(children.length).toBe(4);
      expect(children[0].getAttribute('data-index')).toBe('1');
      expect(children[1].getAttribute('data-index')).toBe('2');
      expect(children[2]).toBe(element);
      expect(children[3].getAttribute('data-index')).toBe('3');
    });
  });

  describe('getSheet', () => {
    it('returns the CSSStyleSheet for a style element in the document', () => {
      const style = makeStyleTag();
      const sheet = getSheet(style);
      expect(sheet).toBeInstanceOf(CSSStyleSheet);
      style.remove();
    });

    it('creates a style element inside a Shadow DOM', () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const shadowRoot = host.attachShadow({ mode: 'open' });

      const style = makeStyleTag(shadowRoot);
      expect(style.parentNode).toBe(shadowRoot);

      document.body.removeChild(host);
    });
  });
});

describe('Tag', () => {
  const describeTag = (TagClass: C.Class<[], Tag>) => {
    it('inserts and retrieves rules at indices', () => {
      const tag = new TagClass();
      expect(tag.insertRule(0, '.b {}')).toBe(true);
      expect(tag.insertRule(0, '.a {}')).toBe(true);
      expect(tag.insertRule(2, '.c {}')).toBe(true);
      expect(tag.insertRule(99, '.x {}')).toBe(false);
      expect(tag.getRule(0)).toBe('.a {}');
      expect(tag.getRule(1)).toBe('.b {}');
      expect(tag.getRule(2)).toBe('.c {}');
      expect(tag.getRule(3)).toBe('');
      expect(tag.length).toBe(3);
    });

    it('deletes rules that have been inserted', () => {
      const tag = new TagClass();
      expect(tag.insertRule(0, '.b {}')).toBe(true);
      expect(tag.length).toBe(1);
      tag.deleteRule(0);
      expect(tag.length).toBe(0);
      expect(tag.getRule(0)).toBe('');
    });
  };

  describe('CSSOMTag', () => {
    describeTag(CSSOMTag);

    it('contains an empty TextNode to prevent an Edge quirk', () => {
      const tag = new CSSOMTag();
      const { childNodes } = tag.element;
      expect(childNodes.length).toBe(1);
      expect(childNodes[0].nodeName).toBe('#text');
    });
  });

  describe('VirtualTag', () => {
    describeTag(VirtualTag);
  });
});
