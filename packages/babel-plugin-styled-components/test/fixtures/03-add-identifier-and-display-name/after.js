const Test = styled.div.withConfig({
  displayName: "Test",
  componentId: "s1j54k93-0"
})`width: 100%;`;
const Test2 = true ? styled.div.withConfig({
  displayName: "Test2",
  componentId: "s1j54k93-1"
})`` : styled.div.withConfig({
  displayName: "Test2",
  componentId: "s1j54k93-2"
})``;
const styles = { One: styled.div.withConfig({
    displayName: "One",
    componentId: "s1j54k93-3"
  })`` };
let Component;
Component = styled.div.withConfig({
  displayName: "Component",
  componentId: "s1j54k93-4"
})``;
const WrappedComponent = styled(Inner).withConfig({
  displayName: "WrappedComponent",
  componentId: "s1j54k93-5"
})``;
