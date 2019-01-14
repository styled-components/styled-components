/* global React, styled, render, css */

const Button = styled.button`
  font-size: 16px;
  border-radius: 5px;
  padding: 0.25em 1em;
  margin: 1em 1em;
  background: transparent;
  color: palevioletred;
  border: 2px solid palevioletred;

  ${props =>
    props.primary &&
    css`
      background: palevioletred;
      color: white;
    `};
`;

const content = [<Button>Normal Button</Button>, <Button primary>Primary Button</Button>];

render(content);
