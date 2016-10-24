const Test = function () {
  var c = styled.div` width: 100%;`;
  c.displayName = "Test";
  return c;
}();
const Test2 = true ? function () {
  var c = styled.div``;
  c.displayName = "Test2";
  return c;
}() : function () {
  var c = styled.div``;
  c.displayName = "Test2";
  return c;
}();
const styles = { One: function () {
    var c = styled.div``;
    c.displayName = "One";
    return c;
  }() };
let Component;
Component = function () {
  var c = styled.div``;
  c.displayName = "Component";
  return c;
}();
const WrappedComponent = function () {
  var c = styled(Inner)``;
  c.displayName = "WrappedComponent";
  return c;
}();
