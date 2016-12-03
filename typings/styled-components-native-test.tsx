import * as React from "react-native";
import styled from "../native";

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
