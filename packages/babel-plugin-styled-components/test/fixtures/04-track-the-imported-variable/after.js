import s from "styled-components";

const Test = s.div.withConfig({
  displayName: "Test",
  componentId: "Test-62sgar"
})`width: 100%;`;
const Test2 = true ? s.div.withConfig({
  displayName: "Test2",
  componentId: "Test2-1rmo90j"
})`` : s.div.withConfig({
  displayName: "Test2",
  componentId: "Test2-1e44ey5"
})``;
const styles = { One: s.div.withConfig({
    displayName: "One",
    componentId: "One-amesrd"
  })`` };
let Component;
Component = s.div.withConfig({
  displayName: "Component",
  componentId: "Component-ohabty"
})``;
const WrappedComponent = s(Inner).withConfig({
  displayName: "WrappedComponent",
  componentId: "WrappedComponent-1f8r9pi"
})``;
