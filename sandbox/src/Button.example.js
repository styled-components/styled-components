/* global React, placeable, render, css */

const Button = placeable.button`
  font-size: 16px;
  border-radius: 5px;
  padding: 0.25em 1em;
  margin: 1em 1em;
  background: transparent;
  color: palevioletred;
  border: 2px solid palevioletred;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  ${props =>
    props.primary &&
    css`
      background: palevioletred;
      color: white;
    `};
`;

const Composed = placeable(Button)`
  width: 80px;
`;

const content = [<Button>Normal Button</Button>, <Composed >Button Composed</Composed>];

render(content);
