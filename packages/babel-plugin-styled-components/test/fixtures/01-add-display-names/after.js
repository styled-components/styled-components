const Test = styled({
  target: 'div',
  displayName: 'Test'
})`width: 100%;`;
const Test2 = styled({
  target: 'div',
  displayName: 'Test2'
})``;
const Test3 = true ? styled({
  target: 'div',
  displayName: 'Test3'
})`` : styled({
  target: 'div',
  displayName: 'Test3'
})``;
const styles = { One: styled({
    target: 'div',
    displayName: 'One'
  })`` };
let Component;
Component = styled({
  target: 'div',
  displayName: 'Component'
})``;
const WrappedComponent = styled({
  target: Inner,
  displayName: 'WrappedComponent'
})``;
