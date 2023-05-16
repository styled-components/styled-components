import styled, { css } from 'styled-components';

const Button = styled.button<{ $primary?: boolean }>`
  font-size: 16px;
  border-radius: 5px;
  padding: 0.25em 1em;
  margin: 1em 1em;
  background: transparent;
  color: palevioletred;
  border: 2px solid palevioletred;
  cursor: pointer;

  ${props =>
    props.$primary &&
    css`
      background: palevioletred;
      color: white;
    `};
`;

export default function ButtonExample() {
  return (
    <>
      <Button onClick={() => alert('Clicked!')}>Normal Button</Button>
      <Button $primary onClick={() => alert('Clicked!')}>
        Primary Button
      </Button>
    </>
  );
}
