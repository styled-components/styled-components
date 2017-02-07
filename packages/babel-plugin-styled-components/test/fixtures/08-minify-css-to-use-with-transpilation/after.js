'use strict';

var _templateObject = _taggedTemplateLiteral(['width: 100%;'], ['width: 100%;']),
    _templateObject2 = _taggedTemplateLiteral(['content: "  ', '  ";'], ['content: "  ', '  ";']),
    _templateObject3 = _taggedTemplateLiteral(['content: "  ', '  ";color: red;'], ['content: "  ', '  ";color: red;']),
    _templateObject4 = _taggedTemplateLiteral(['// comment\ncolor: red;'], ['// comment\ncolor: red;']),
    _templateObject5 = _taggedTemplateLiteral(['&:hover {color: blue;}'], ['&:hover {color: blue;}']);

var _styledComponents = require('styled-components');

var _styledComponents2 = _interopRequireDefault(_styledComponents);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var Simple = _styledComponents2.default.div(_templateObject);

var Interpolation = _styledComponents2.default.div(_templateObject2, function (props) {
  return props.text;
});

var SpecialCharacters = _styledComponents2.default.div(_templateObject3, function (props) {
  return props.text;
});

var Comment = _styledComponents2.default.div(_templateObject4);

var Parens = _styledComponents2.default.div(_templateObject5);
