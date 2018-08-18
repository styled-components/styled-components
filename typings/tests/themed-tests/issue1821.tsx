import * as React from "react";
import styled, { css } from "./mytheme-styled-components";

const mixin = css`
  color: ${props => `blue`};
`;

const UseMixin = styled.div`
  ${mixin};
`;

<UseMixin>test</UseMixin>;
