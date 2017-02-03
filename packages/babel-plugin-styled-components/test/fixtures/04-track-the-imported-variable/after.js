import s from "styled-components";

const Test = s.div.withConfig({
  displayName: "Test",
  componentId: "syqrfc-0"
})`width: 100%;`;
const Test2 = true ? s.div.withConfig({
  displayName: "Test2",
  componentId: "syqrfc-1"
})`` : s.div.withConfig({
  displayName: "Test2",
  componentId: "syqrfc-2"
})``;
const styles = { One: s.div.withConfig({
    displayName: "One",
    componentId: "syqrfc-3"
  })`` };
let Component;
Component = s.div.withConfig({
  displayName: "Component",
  componentId: "syqrfc-4"
})``;
const WrappedComponent = s(Inner).withConfig({
  displayName: "WrappedComponent",
  componentId: "syqrfc-5"
})``;
