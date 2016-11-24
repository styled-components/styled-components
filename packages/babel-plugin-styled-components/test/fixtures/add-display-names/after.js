const Test = styled({
  target: 'div',
  displayName: 'Test',
  identifier: undefined
})` width: 100%;`;
const Test2 = styled({
  target: 'div',
  displayName: 'Test2',
  identifier: undefined
})``;
const Test3 = true ? styled({
  target: 'div',
  displayName: 'Test3',
  identifier: undefined
})`` : styled({
  target: 'div',
  displayName: 'Test3',
  identifier: undefined
})``;
const styles = { One: styled({
    target: 'div',
    displayName: 'One',
    identifier: undefined
  })`` };
let Component;
Component = styled({
  target: 'div',
  displayName: 'Component',
  identifier: undefined
})``;
const WrappedComponent = styled({
  target: Inner,
  displayName: 'WrappedComponent',
  identifier: undefined
})``;
