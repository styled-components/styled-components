const Test = function () {
  var c = styled.div` width: 100%;`;
  c.identifier = 7;
  c.displayName = "Test";
  return c;
}();
const Test2 = true ? function () {
  var c = styled.div``;
  c.identifier = 8;
  c.displayName = "Test2";
  return c;
}() : function () {
  var c = styled.div``;
  c.identifier = 9;
  c.displayName = "Test2";
  return c;
}();
const styles = { One: function () {
    var c = styled.div``;
    c.identifier = 10;
    c.displayName = "One";
    return c;
  }() };
let Component;
Component = function () {
  var c = styled.div``;
  c.identifier = 11;
  c.displayName = "Component";
  return c;
}();
const WrappedComponent = function () {
  var c = styled(Inner)``;
  c.identifier = 12;
  c.displayName = "WrappedComponent";
  return c;
}();
