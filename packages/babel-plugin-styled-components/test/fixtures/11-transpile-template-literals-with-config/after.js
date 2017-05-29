'use strict';

var _styledComponents = require('styled-components');

var _styledComponents2 = _interopRequireDefault(_styledComponents);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Named = _styledComponents2.default.div.withConfig({
  displayName: 'before__Named'
})(['width: 100%;']);

var NamedWithInterpolation = _styledComponents2.default.div.withConfig({
  displayName: 'before__NamedWithInterpolation'
})(['color: ', ';'], function (color) {
  return props.color;
});

var Wrapped = (0, _styledComponents2.default)(Inner).withConfig({
  displayName: 'before__Wrapped'
})(['color: red;']);
