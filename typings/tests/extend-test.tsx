import * as React from "react";

import styled from "../..";

const Button = styled.button`
  color: palevioletred;
  font-size: 1em;
  margin: 1em;
  padding: 0.25em 1em;
  border: 2px solid palevioletred;
  border-radius: 3px;
`;

// We're extending Button with some extra styles
const TomatoButton = Button.extend`
  color: tomato;
  border-color: tomato;
`;
