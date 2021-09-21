import styled, { css, cssvar } from 'styled-components';

const Button = styled.button`
  font-size: 16px;
  border-radius: 5px;
  padding: 0.25em 1em;
  margin: 1em 1em;
  background: transparent;
  color: ${cssvar('buttonColor')};
  border: 2px solid ${cssvar('buttonColor')};
  cursor: pointer;

  ${props =>
    props.primary &&
    css`
      background: ${cssvar('buttonColor')};
      color: white;
    `};
`;

export default function ButtonExample() {
  return (
    <>
      <Button onClick={() => alert('Clicked!')}>Normal Button</Button>
      <Button primary onClick={() => alert('Clicked!')}>
        Primary Button
      </Button>
    </>
  );
}
