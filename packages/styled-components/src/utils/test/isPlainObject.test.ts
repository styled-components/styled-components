import React from 'react';
import vm from 'vm';
import isPlainObject from '../isPlainObject';

it('returns true for an object literal', () => {
  expect(isPlainObject({})).toEqual(true);
});

it('returns false for an instance of a class with its own toString method', () => {
  class SomeClass {
    toString() {
      return 'some: thing;';
    }
  }
  expect(isPlainObject(new SomeClass())).toEqual(false);
});

it('returns false for an instance of an object with a custom prototype', () => {
  class SomeObj {}
  expect(isPlainObject(new SomeObj())).toEqual(false);
});

it('returns false for a function', () => {
  expect(isPlainObject(() => {})).toEqual(false);
});

it('returns false for an array', () => {
  expect(isPlainObject([])).toEqual(false);
});

it('returns false for a React component', () => {
  class Foo extends React.Component {}
  expect(isPlainObject(Foo)).toEqual(false);
});

it('returns false for a React element', () => {
  expect(isPlainObject(React.createElement('div'))).toEqual(false);
});

it('returns true for an object literal created in a different context', () => {
  const context = vm.createContext({});
  vm.runInContext('object = {};', context);
  expect(isPlainObject(context.object)).toEqual(true);
});
