/// <reference path="styled-components-native.d.ts" />

import * as React from "react-native";
import styled from "styled-components/native";

const StyledView = styled.View`
  background-color: papayawhip;
`;

const StyledText = styled.Text`
  color: palevioletred;
`;

class MyReactNativeComponent extends React.Component<{}, {}> {
  render() {
    return <StyledView>
      <StyledText>Hello World!</StyledText>
    </StyledView>;
  }
}
