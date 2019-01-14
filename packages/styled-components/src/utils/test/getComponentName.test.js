// @flow
import React from 'react';
import getComponentName from '../getComponentName';

describe('getComponentName', () => {
  let Test;
  beforeEach(() => {
    Test = () => <div />;
  });

  it('defaults to reusing the component displayName', () => {
    Test.displayName = 'Foo';

    expect(getComponentName(Test)).toEqual('Foo');
  });

  it('falls back to the class name', () => {
    expect(getComponentName(Test)).toEqual('Test');
  });

  it('ultimately falls back to "Component"', () => {
    Object.defineProperty(Test, 'name', {
      value: '',
    });

    expect(getComponentName(Test)).toEqual('Component');
  });
});
