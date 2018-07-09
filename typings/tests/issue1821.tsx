import * as React from "react";
import styled, { css } from "../..";

const mixin = css`
  color: ${props => `blue`};
`;

const UseMixin = styled.div`
  ${mixin};
`;

<UseMixin>test</UseMixin>;
