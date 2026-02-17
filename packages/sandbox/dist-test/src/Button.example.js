import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import styled, { css } from 'styled-components';
const Button = styled.button `
  font-size: 16px;
  border-radius: 5px;
  padding: 0.25em 1em;
  margin: 1em 1em;
  background: transparent;
  color: palevioletred;
  border: 2px solid palevioletred;
  cursor: pointer;

  ${props => props.$primary &&
    css `
      background: palevioletred;
      color: white;
    `};
`;
export default function ButtonExample() {
    return (_jsxs(_Fragment, { children: [_jsx(Button, { onClick: () => alert('Clicked!'), children: "Normal Button" }), _jsx(Button, { "$primary": true, onClick: () => alert('Clicked!'), children: "Primary Button" })] }));
}
