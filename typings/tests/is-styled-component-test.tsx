import * as React from "react";

import styled, { isStyledComponent } from "../..";

const StyledComponent = styled.h1``

const StatelessComponent = () => <div />

class ClassComponent extends React.Component {
  render() {
    return <div />
  }
}

isStyledComponent(StyledComponent);
isStyledComponent(StatelessComponent);
isStyledComponent(ClassComponent);
isStyledComponent('div');
