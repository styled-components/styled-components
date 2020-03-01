// @flow
import 'jest-styled-components';
import * as React from 'react';
import renderer from 'react-test-renderer';
import styled from '..';

const Button = styled.button`
  color: red;
`;

test('it works', () => {
  const tree = renderer.create(<Button />).toJSON();
  expect(tree).toMatchSnapshot();
  expect(tree).toHaveStyleRule('color', 'red');
});
