import s from "styled-components";

const Test = s.div.withConfig({
  displayName: "Test",
  identifier: "Test-62sgar"
})`width: 100%;`;
const Test2 = true ? s.div.withConfig({
  displayName: "Test2",
  identifier: "Test2-1rmo90j"
})`` : s.div.withConfig({
  displayName: "Test2",
  identifier: "Test2-1e44ey5"
})``;
const styles = { One: s.div.withConfig({
    displayName: "One",
    identifier: "One-amesrd"
  })`` };
let Component;
Component = s.div.withConfig({
  displayName: "Component",
  identifier: "Component-ohabty"
})``;
const WrappedComponent = s(Inner).withConfig({
  displayName: "WrappedComponent",
  identifier: "WrappedComponent-1f8r9pi"
})``;
