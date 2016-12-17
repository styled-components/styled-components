import s from "styled-components";

const Test = s({
  target: "div",
  displayName: "Test",
  identifier: "Test-62sgar"
})`width: 100%;`;
const Test2 = true ? s({
  target: "div",
  displayName: "Test2",
  identifier: "Test2-1rmo90j"
})`` : s({
  target: "div",
  displayName: "Test2",
  identifier: "Test2-1e44ey5"
})``;
const styles = { One: s({
    target: "div",
    displayName: "One",
    identifier: "One-amesrd"
  })`` };
let Component;
Component = s({
  target: "div",
  displayName: "Component",
  identifier: "Component-ohabty"
})``;
const WrappedComponent = s({
  target: Inner,
  displayName: "WrappedComponent",
  identifier: "WrappedComponent-1f8r9pi"
})``;
