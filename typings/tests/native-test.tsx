import * as React from "react";
import styledFromNative from "../../native";
import styled from "../..";

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

const StyledViewFromNative = styledFromNative.View`
  background-color: papayawhip;
`;

const StyledTextFromNative = styledFromNative.Text`
  color: palevioletred;
`;

class MyReactNativeComponentFromNativeDir extends React.Component<{}, {}> {
  render() {
    return <StyledView>
      <StyledText>Hello World!</StyledText>
    </StyledView>;
  }
}
