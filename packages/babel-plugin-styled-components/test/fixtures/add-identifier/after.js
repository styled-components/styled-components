const Test = function () {
  var c = styled.div` width: 100%;`;
  c.identifier = 1;
  return c;
}();
const Test2 = true ? function () {
  var c = styled.div``;
  c.identifier = 2;
  return c;
}() : function () {
  var c = styled.div``;
  c.identifier = 3;
  return c;
}();
const styles = { One: function () {
    var c = styled.div``;
    c.identifier = 4;
    return c;
  }() };
let Component;
Component = function () {
  var c = styled.div``;
  c.identifier = 5;
  return c;
}();
const WrappedComponent = function () {
  var c = styled(Inner)``;
  c.identifier = 6;
  return c;
}();
