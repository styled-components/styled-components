import styled from "styled-components";

const Test = styled.div.withConfig({
  displayName: "before__Test",
  componentId: "gl3p53-0"
})`color: red;`;
styled.div.withConfig({
  displayName: "before",
  componentId: "gl3p53-1"
})``;
export default styled.button.withConfig({
  displayName: "before",
  componentId: "gl3p53-2"
})``;
