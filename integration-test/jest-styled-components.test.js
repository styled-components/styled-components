// @flow
import 'jest-styled-components';
import React from 'react';
import renderer from 'react-test-renderer';
import {placeable} from '..';

const Button = placeable.button`
  color: red;
`;

test('it works', () => {
  const tree = renderer.create(<Button />).toJSON();
  expect(tree).toMatchSnapshot();
  expect(tree).toHaveStyleRule('color', 'red');
});
