'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// Generated automatically by nearley
// http://github.com/Hardmath123/nearley
(function () {
  function id(x) {
    return x[0];
  }

  var cssColorList = require('css-color-list')();

  var at = function at(index) {
    return function (d) {
      return d && d[index];
    };
  };
  var pick = function pick(indices) {
    return function (d) {
      return indices.map(function (index) {
        return d[index];
      });
    };
  };
  var text = function text(d) {
    return Array.isArray(d) ? d.map(text).join('') : d;
  };
  var transformArg1 = function transformArg1(d) {
    return _defineProperty({}, d[0].join(''), d[2][0]);
  };
  var defaultOptional = function defaultOptional(value, defaultValue) {
    return value === null ? defaultValue : value;
  };

  var combineHeadTail = function combineHeadTail(_ref2) {
    var _ref3 = _slicedToArray(_ref2, 2),
        head = _ref3[0],
        tail = _ref3[1];

    var tailValues = tail.reduce(function (accum, value) {
      return accum.concat(value[1]);
    }, []);
    return [].concat(head, tailValues);
  };

  var combineAnyOrder = function combineAnyOrder(index) {
    return function (d) {
      var array = d[2].slice();
      array.splice(index, 0, d[0][0]);
      return array;
    };
  };

  var combineClockwiseShorthand = function combineClockwiseShorthand(prefix) {
    var keys = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ['Top', 'Right', 'Bottom', 'Left'];
    var suffix = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
    return function (d, location, reject) {
      var _$merge;

      var values = combineHeadTail(d);

      if (values.length > 4) return reject;

      var _values = _slicedToArray(values, 4),
          top = _values[0],
          _values$ = _values[1],
          right = _values$ === undefined ? top : _values$,
          _values$2 = _values[2],
          bottom = _values$2 === undefined ? top : _values$2,
          _values$3 = _values[3],
          left = _values$3 === undefined ? right : _values$3;

      return { $merge: (_$merge = {}, _defineProperty(_$merge, prefix + keys[0] + suffix, top), _defineProperty(_$merge, prefix + keys[1] + suffix, right), _defineProperty(_$merge, prefix + keys[2] + suffix, bottom), _defineProperty(_$merge, prefix + keys[3] + suffix, left), _$merge) };
    };
  };

  var transformArg1XY = function transformArg1XY(yValue) {
    return function (d) {
      var fn = d[0];
      return [_defineProperty({}, fn + 'X', d[2][0]), _defineProperty({}, fn + 'Y', yValue)];
    };
  };
  var transformArg2 = function transformArg2(d) {
    var fn = d[0];

    var _d$ = _slicedToArray(d[2], 2),
        arg1 = _d$[0],
        arg2 = _d$[1];

    return [_defineProperty({}, fn + 'X', arg1[0]), _defineProperty({}, fn + 'Y', arg2[0])];
  };
  var grammar = {
    ParserRules: [{ "name": "number$subexpression$1$ebnf$1", "symbols": [/[0-9]/] }, { "name": "number$subexpression$1$ebnf$1", "symbols": [/[0-9]/, "number$subexpression$1$ebnf$1"], "postprocess": function arrconcat(d) {
        return [d[0]].concat(d[1]);
      } }, { "name": "number$subexpression$1", "symbols": ["number$subexpression$1$ebnf$1"] }, { "name": "number", "symbols": ["number$subexpression$1"], "postprocess": function postprocess(d) {
        return Number(text(d));
      } }, { "name": "angle$subexpression$1$string$1", "symbols": [{ "literal": "d" }, { "literal": "e" }, { "literal": "g" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "angle$subexpression$1", "symbols": ["angle$subexpression$1$string$1"] }, { "name": "angle$subexpression$1$string$2", "symbols": [{ "literal": "r" }, { "literal": "a" }, { "literal": "d" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "angle$subexpression$1", "symbols": ["angle$subexpression$1$string$2"] }, { "name": "angle", "symbols": ["number", "angle$subexpression$1"], "postprocess": text }, { "name": "ident$subexpression$1$ebnf$1", "symbols": [{ "literal": "-" }], "postprocess": id }, { "name": "ident$subexpression$1$ebnf$1", "symbols": [], "postprocess": function postprocess(d) {
        return null;
      } }, { "name": "ident$subexpression$1$ebnf$2", "symbols": [] }, { "name": "ident$subexpression$1$ebnf$2", "symbols": [/[_A-Za-z0-9-]/, "ident$subexpression$1$ebnf$2"], "postprocess": function arrconcat(d) {
        return [d[0]].concat(d[1]);
      } }, { "name": "ident$subexpression$1", "symbols": ["ident$subexpression$1$ebnf$1", /[_A-Za-z]/, "ident$subexpression$1$ebnf$2"] }, { "name": "ident", "symbols": ["ident$subexpression$1"], "postprocess": text }, { "name": "color$subexpression$1$ebnf$1", "symbols": [] }, { "name": "color$subexpression$1$ebnf$1", "symbols": [/[a-fA-F0-9]/, "color$subexpression$1$ebnf$1"], "postprocess": function arrconcat(d) {
        return [d[0]].concat(d[1]);
      } }, { "name": "color$subexpression$1", "symbols": ["color$subexpression$1$ebnf$1"] }, { "name": "color", "symbols": [{ "literal": "#" }, "color$subexpression$1"], "postprocess": text }, { "name": "color$subexpression$2$string$1", "symbols": [{ "literal": "r" }, { "literal": "g" }, { "literal": "b" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "color$subexpression$2", "symbols": ["color$subexpression$2$string$1"] }, { "name": "color$subexpression$2$string$2", "symbols": [{ "literal": "h" }, { "literal": "s" }, { "literal": "l" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "color$subexpression$2", "symbols": ["color$subexpression$2$string$2"] }, { "name": "color$subexpression$2$string$3", "symbols": [{ "literal": "h" }, { "literal": "s" }, { "literal": "v" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "color$subexpression$2", "symbols": ["color$subexpression$2$string$3"] }, { "name": "color$subexpression$3$ebnf$1", "symbols": [{ "literal": "a" }], "postprocess": id }, { "name": "color$subexpression$3$ebnf$1", "symbols": [], "postprocess": function postprocess(d) {
        return null;
      } }, { "name": "color$subexpression$3", "symbols": ["color$subexpression$3$ebnf$1"] }, { "name": "color$subexpression$4$ebnf$1", "symbols": [/[^)]/] }, { "name": "color$subexpression$4$ebnf$1", "symbols": [/[^)]/, "color$subexpression$4$ebnf$1"], "postprocess": function arrconcat(d) {
        return [d[0]].concat(d[1]);
      } }, { "name": "color$subexpression$4", "symbols": ["color$subexpression$4$ebnf$1"] }, { "name": "color", "symbols": ["color$subexpression$2", "color$subexpression$3", { "literal": "(" }, "color$subexpression$4", { "literal": ")" }], "postprocess": text }, { "name": "color$subexpression$5$ebnf$1", "symbols": [/[A-Za-z]/] }, { "name": "color$subexpression$5$ebnf$1", "symbols": [/[A-Za-z]/, "color$subexpression$5$ebnf$1"], "postprocess": function arrconcat(d) {
        return [d[0]].concat(d[1]);
      } }, { "name": "color$subexpression$5", "symbols": ["color$subexpression$5$ebnf$1"] }, { "name": "color", "symbols": ["color$subexpression$5"], "postprocess": function postprocess(d, location, reject) {
        var name = text(d).toLowerCase();
        return cssColorList.indexOf(name) !== -1 ? name : reject;
      } }, { "name": "_$ebnf$1", "symbols": [] }, { "name": "_$ebnf$1", "symbols": [/[ \t\n\r]/, "_$ebnf$1"], "postprocess": function arrconcat(d) {
        return [d[0]].concat(d[1]);
      } }, { "name": "_", "symbols": ["_$ebnf$1"], "postprocess": function postprocess() {
        return null;
      } }, { "name": "__$ebnf$1", "symbols": [/[ \t\n\r]/] }, { "name": "__$ebnf$1", "symbols": [/[ \t\n\r]/, "__$ebnf$1"], "postprocess": function arrconcat(d) {
        return [d[0]].concat(d[1]);
      } }, { "name": "__", "symbols": ["__$ebnf$1"], "postprocess": function postprocess() {
        return null;
      } }, { "name": "transformPart$subexpression$1$string$1", "symbols": [{ "literal": "p" }, { "literal": "e" }, { "literal": "r" }, { "literal": "s" }, { "literal": "p" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }, { "literal": "i" }, { "literal": "v" }, { "literal": "e" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "transformPart$subexpression$1", "symbols": ["transformPart$subexpression$1$string$1"] }, { "name": "transformPart$subexpression$1$string$2", "symbols": [{ "literal": "s" }, { "literal": "c" }, { "literal": "a" }, { "literal": "l" }, { "literal": "e" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "transformPart$subexpression$1$ebnf$1", "symbols": [/[XY]/], "postprocess": id }, { "name": "transformPart$subexpression$1$ebnf$1", "symbols": [], "postprocess": function postprocess(d) {
        return null;
      } }, { "name": "transformPart$subexpression$1", "symbols": ["transformPart$subexpression$1$string$2", "transformPart$subexpression$1$ebnf$1"] }, { "name": "transformPart$subexpression$1$string$3", "symbols": [{ "literal": "t" }, { "literal": "r" }, { "literal": "a" }, { "literal": "n" }, { "literal": "s" }, { "literal": "l" }, { "literal": "a" }, { "literal": "t" }, { "literal": "e" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "transformPart$subexpression$1", "symbols": ["transformPart$subexpression$1$string$3", /[XY]/] }, { "name": "transformPart$macrocall$2", "symbols": ["number"] }, { "name": "transformPart$macrocall$1", "symbols": [{ "literal": "(" }, "_", "transformPart$macrocall$2", "_", { "literal": ")" }], "postprocess": at(2) }, { "name": "transformPart", "symbols": ["transformPart$subexpression$1", "_", "transformPart$macrocall$1"], "postprocess": transformArg1 }, { "name": "transformPart$subexpression$2$string$1", "symbols": [{ "literal": "r" }, { "literal": "o" }, { "literal": "t" }, { "literal": "a" }, { "literal": "t" }, { "literal": "e" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "transformPart$subexpression$2$ebnf$1", "symbols": [/[XYZ]/], "postprocess": id }, { "name": "transformPart$subexpression$2$ebnf$1", "symbols": [], "postprocess": function postprocess(d) {
        return null;
      } }, { "name": "transformPart$subexpression$2", "symbols": ["transformPart$subexpression$2$string$1", "transformPart$subexpression$2$ebnf$1"] }, { "name": "transformPart$subexpression$2$string$2", "symbols": [{ "literal": "s" }, { "literal": "k" }, { "literal": "e" }, { "literal": "w" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "transformPart$subexpression$2", "symbols": ["transformPart$subexpression$2$string$2", /[XY]/] }, { "name": "transformPart$macrocall$4", "symbols": ["angle"] }, { "name": "transformPart$macrocall$3", "symbols": [{ "literal": "(" }, "_", "transformPart$macrocall$4", "_", { "literal": ")" }], "postprocess": at(2) }, { "name": "transformPart", "symbols": ["transformPart$subexpression$2", "_", "transformPart$macrocall$3"], "postprocess": transformArg1 }, { "name": "transformPart$subexpression$3$string$1", "symbols": [{ "literal": "t" }, { "literal": "r" }, { "literal": "a" }, { "literal": "n" }, { "literal": "s" }, { "literal": "l" }, { "literal": "a" }, { "literal": "t" }, { "literal": "e" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "transformPart$subexpression$3", "symbols": ["transformPart$subexpression$3$string$1"] }, { "name": "transformPart$macrocall$6", "symbols": ["number"] }, { "name": "transformPart$macrocall$5", "symbols": [{ "literal": "(" }, "_", "transformPart$macrocall$6", "_", { "literal": ")" }], "postprocess": at(2) }, { "name": "transformPart", "symbols": ["transformPart$subexpression$3", "_", "transformPart$macrocall$5"], "postprocess": transformArg1XY(0) }, { "name": "transformPart$subexpression$4$string$1", "symbols": [{ "literal": "s" }, { "literal": "k" }, { "literal": "e" }, { "literal": "w" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "transformPart$subexpression$4", "symbols": ["transformPart$subexpression$4$string$1"] }, { "name": "transformPart$macrocall$8", "symbols": ["angle"] }, { "name": "transformPart$macrocall$7", "symbols": [{ "literal": "(" }, "_", "transformPart$macrocall$8", "_", { "literal": ")" }], "postprocess": at(2) }, { "name": "transformPart", "symbols": ["transformPart$subexpression$4", "_", "transformPart$macrocall$7"], "postprocess": transformArg1XY('0deg') }, { "name": "transformPart$subexpression$5$string$1", "symbols": [{ "literal": "s" }, { "literal": "c" }, { "literal": "a" }, { "literal": "l" }, { "literal": "e" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "transformPart$subexpression$5", "symbols": ["transformPart$subexpression$5$string$1"] }, { "name": "transformPart$subexpression$5$string$2", "symbols": [{ "literal": "t" }, { "literal": "r" }, { "literal": "a" }, { "literal": "n" }, { "literal": "s" }, { "literal": "l" }, { "literal": "a" }, { "literal": "t" }, { "literal": "e" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "transformPart$subexpression$5", "symbols": ["transformPart$subexpression$5$string$2"] }, { "name": "transformPart$macrocall$10", "symbols": ["number"] }, { "name": "transformPart$macrocall$9", "symbols": [{ "literal": "(" }, "_", "transformPart$macrocall$10", "_", { "literal": "," }, "_", "transformPart$macrocall$10", "_", { "literal": ")" }], "postprocess": pick([2, 6]) }, { "name": "transformPart", "symbols": ["transformPart$subexpression$5", "_", "transformPart$macrocall$9"], "postprocess": transformArg2 }, { "name": "transformPart$subexpression$6$string$1", "symbols": [{ "literal": "s" }, { "literal": "k" }, { "literal": "e" }, { "literal": "w" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "transformPart$subexpression$6", "symbols": ["transformPart$subexpression$6$string$1"] }, { "name": "transformPart$macrocall$12", "symbols": ["angle"] }, { "name": "transformPart$macrocall$11", "symbols": [{ "literal": "(" }, "_", "transformPart$macrocall$12", "_", { "literal": "," }, "_", "transformPart$macrocall$12", "_", { "literal": ")" }], "postprocess": pick([2, 6]) }, { "name": "transformPart", "symbols": ["transformPart$subexpression$6", "_", "transformPart$macrocall$11"], "postprocess": transformArg2 }, { "name": "transform$ebnf$1", "symbols": [] }, { "name": "transform$ebnf$1$subexpression$1", "symbols": ["_", "transformPart"] }, { "name": "transform$ebnf$1", "symbols": ["transform$ebnf$1$subexpression$1", "transform$ebnf$1"], "postprocess": function arrconcat(d) {
        return [d[0]].concat(d[1]);
      } }, { "name": "transform", "symbols": ["transformPart", "transform$ebnf$1"], "postprocess": function postprocess(d) {
        return combineHeadTail(d).reverse();
      } }, { "name": "shadowOffset", "symbols": ["number", "__", "number"], "postprocess": function postprocess(d) {
        return { width: d[0], height: d[2] };
      } }, { "name": "textShadowOffset", "symbols": ["shadowOffset"], "postprocess": at(0) }, { "name": "fontVariant$ebnf$1", "symbols": [] }, { "name": "fontVariant$ebnf$1$subexpression$1", "symbols": ["__", "ident"] }, { "name": "fontVariant$ebnf$1", "symbols": ["fontVariant$ebnf$1$subexpression$1", "fontVariant$ebnf$1"], "postprocess": function arrconcat(d) {
        return [d[0]].concat(d[1]);
      } }, { "name": "fontVariant", "symbols": ["ident", "fontVariant$ebnf$1"], "postprocess": combineHeadTail }, { "name": "fontWeight$ebnf$1", "symbols": [/./] }, { "name": "fontWeight$ebnf$1", "symbols": [/./, "fontWeight$ebnf$1"], "postprocess": function arrconcat(d) {
        return [d[0]].concat(d[1]);
      } }, { "name": "fontWeight", "symbols": ["fontWeight$ebnf$1"], "postprocess": text }, { "name": "background", "symbols": ["color"], "postprocess": function postprocess(d) {
        return { $merge: { backgroundColor: d[0] } };
      } }, { "name": "border$macrocall$2", "symbols": ["number"] }, { "name": "border$macrocall$3", "symbols": ["ident"] }, { "name": "border$macrocall$4", "symbols": ["color"] }, { "name": "border$macrocall$1$macrocall$2", "symbols": ["border$macrocall$2"] }, { "name": "border$macrocall$1$macrocall$3", "symbols": ["border$macrocall$3"] }, { "name": "border$macrocall$1$macrocall$4", "symbols": ["border$macrocall$4"] }, { "name": "border$macrocall$1$macrocall$1$macrocall$2", "symbols": ["border$macrocall$1$macrocall$3"] }, { "name": "border$macrocall$1$macrocall$1$macrocall$3", "symbols": ["border$macrocall$1$macrocall$4"] }, { "name": "border$macrocall$1$macrocall$1$macrocall$1", "symbols": ["border$macrocall$1$macrocall$1$macrocall$2", "__", "border$macrocall$1$macrocall$1$macrocall$3"], "postprocess": function postprocess(d) {
        return [d[0][0][0], d[2][0][0]];
      } }, { "name": "border$macrocall$1$macrocall$1$macrocall$1", "symbols": ["border$macrocall$1$macrocall$1$macrocall$3", "__", "border$macrocall$1$macrocall$1$macrocall$2"], "postprocess": function postprocess(d) {
        return [d[2][0][0], d[0][0][0]];
      } }, { "name": "border$macrocall$1$macrocall$1", "symbols": ["border$macrocall$1$macrocall$2", "__", "border$macrocall$1$macrocall$1$macrocall$1"], "postprocess": combineAnyOrder(0) }, { "name": "border$macrocall$1$macrocall$1$macrocall$5", "symbols": ["border$macrocall$1$macrocall$2"] }, { "name": "border$macrocall$1$macrocall$1$macrocall$6", "symbols": ["border$macrocall$1$macrocall$4"] }, { "name": "border$macrocall$1$macrocall$1$macrocall$4", "symbols": ["border$macrocall$1$macrocall$1$macrocall$5", "__", "border$macrocall$1$macrocall$1$macrocall$6"], "postprocess": function postprocess(d) {
        return [d[0][0][0], d[2][0][0]];
      } }, { "name": "border$macrocall$1$macrocall$1$macrocall$4", "symbols": ["border$macrocall$1$macrocall$1$macrocall$6", "__", "border$macrocall$1$macrocall$1$macrocall$5"], "postprocess": function postprocess(d) {
        return [d[2][0][0], d[0][0][0]];
      } }, { "name": "border$macrocall$1$macrocall$1", "symbols": ["border$macrocall$1$macrocall$3", "__", "border$macrocall$1$macrocall$1$macrocall$4"], "postprocess": combineAnyOrder(1) }, { "name": "border$macrocall$1$macrocall$1$macrocall$8", "symbols": ["border$macrocall$1$macrocall$2"] }, { "name": "border$macrocall$1$macrocall$1$macrocall$9", "symbols": ["border$macrocall$1$macrocall$3"] }, { "name": "border$macrocall$1$macrocall$1$macrocall$7", "symbols": ["border$macrocall$1$macrocall$1$macrocall$8", "__", "border$macrocall$1$macrocall$1$macrocall$9"], "postprocess": function postprocess(d) {
        return [d[0][0][0], d[2][0][0]];
      } }, { "name": "border$macrocall$1$macrocall$1$macrocall$7", "symbols": ["border$macrocall$1$macrocall$1$macrocall$9", "__", "border$macrocall$1$macrocall$1$macrocall$8"], "postprocess": function postprocess(d) {
        return [d[2][0][0], d[0][0][0]];
      } }, { "name": "border$macrocall$1$macrocall$1", "symbols": ["border$macrocall$1$macrocall$4", "__", "border$macrocall$1$macrocall$1$macrocall$7"], "postprocess": combineAnyOrder(2) }, { "name": "border$macrocall$1", "symbols": ["border$macrocall$1$macrocall$1"], "postprocess": function postprocess(d) {
        return d[0].map(at(0));
      } }, { "name": "border$macrocall$1$macrocall$6", "symbols": ["border$macrocall$2"] }, { "name": "border$macrocall$1$macrocall$7", "symbols": ["border$macrocall$3"] }, { "name": "border$macrocall$1$macrocall$5", "symbols": ["border$macrocall$1$macrocall$6", "__", "border$macrocall$1$macrocall$7"], "postprocess": function postprocess(d) {
        return [d[0][0][0], d[2][0][0]];
      } }, { "name": "border$macrocall$1$macrocall$5", "symbols": ["border$macrocall$1$macrocall$7", "__", "border$macrocall$1$macrocall$6"], "postprocess": function postprocess(d) {
        return [d[2][0][0], d[0][0][0]];
      } }, { "name": "border$macrocall$1", "symbols": ["border$macrocall$1$macrocall$5"], "postprocess": function postprocess(d) {
        return [d[0][0], d[0][1], null];
      } }, { "name": "border$macrocall$1$macrocall$9", "symbols": ["border$macrocall$2"] }, { "name": "border$macrocall$1$macrocall$10", "symbols": ["border$macrocall$4"] }, { "name": "border$macrocall$1$macrocall$8", "symbols": ["border$macrocall$1$macrocall$9", "__", "border$macrocall$1$macrocall$10"], "postprocess": function postprocess(d) {
        return [d[0][0][0], d[2][0][0]];
      } }, { "name": "border$macrocall$1$macrocall$8", "symbols": ["border$macrocall$1$macrocall$10", "__", "border$macrocall$1$macrocall$9"], "postprocess": function postprocess(d) {
        return [d[2][0][0], d[0][0][0]];
      } }, { "name": "border$macrocall$1", "symbols": ["border$macrocall$1$macrocall$8"], "postprocess": function postprocess(d) {
        return [d[0][0], null, d[0][1]];
      } }, { "name": "border$macrocall$1$macrocall$12", "symbols": ["border$macrocall$3"] }, { "name": "border$macrocall$1$macrocall$13", "symbols": ["border$macrocall$4"] }, { "name": "border$macrocall$1$macrocall$11", "symbols": ["border$macrocall$1$macrocall$12", "__", "border$macrocall$1$macrocall$13"], "postprocess": function postprocess(d) {
        return [d[0][0][0], d[2][0][0]];
      } }, { "name": "border$macrocall$1$macrocall$11", "symbols": ["border$macrocall$1$macrocall$13", "__", "border$macrocall$1$macrocall$12"], "postprocess": function postprocess(d) {
        return [d[2][0][0], d[0][0][0]];
      } }, { "name": "border$macrocall$1", "symbols": ["border$macrocall$1$macrocall$11"], "postprocess": function postprocess(d) {
        return [null, d[0][0], d[0][1]];
      } }, { "name": "border$macrocall$1", "symbols": ["border$macrocall$2"], "postprocess": function postprocess(d) {
        return [d[0][0], null, null];
      } }, { "name": "border$macrocall$1", "symbols": ["border$macrocall$3"], "postprocess": function postprocess(d) {
        return [null, d[0][0], null];
      } }, { "name": "border$macrocall$1", "symbols": ["border$macrocall$4"], "postprocess": function postprocess(d) {
        return [null, null, d[0][0]];
      } }, { "name": "border", "symbols": ["border$macrocall$1"], "postprocess": function postprocess(d) {
        return { $merge: {
            borderWidth: defaultOptional(d[0][0], 1),
            borderStyle: defaultOptional(d[0][1], 'solid'),
            borderColor: defaultOptional(d[0][2], 'black')
          } };
      } }, { "name": "margin$ebnf$1", "symbols": [] }, { "name": "margin$ebnf$1$subexpression$1", "symbols": ["_", "number"] }, { "name": "margin$ebnf$1", "symbols": ["margin$ebnf$1$subexpression$1", "margin$ebnf$1"], "postprocess": function arrconcat(d) {
        return [d[0]].concat(d[1]);
      } }, { "name": "margin", "symbols": ["number", "margin$ebnf$1"], "postprocess": combineClockwiseShorthand('margin') }, { "name": "padding$ebnf$1", "symbols": [] }, { "name": "padding$ebnf$1$subexpression$1", "symbols": ["_", "number"] }, { "name": "padding$ebnf$1", "symbols": ["padding$ebnf$1$subexpression$1", "padding$ebnf$1"], "postprocess": function arrconcat(d) {
        return [d[0]].concat(d[1]);
      } }, { "name": "padding", "symbols": ["number", "padding$ebnf$1"], "postprocess": combineClockwiseShorthand('padding') }, { "name": "borderWidth$ebnf$1", "symbols": [] }, { "name": "borderWidth$ebnf$1$subexpression$1", "symbols": ["_", "number"] }, { "name": "borderWidth$ebnf$1", "symbols": ["borderWidth$ebnf$1$subexpression$1", "borderWidth$ebnf$1"], "postprocess": function arrconcat(d) {
        return [d[0]].concat(d[1]);
      } }, { "name": "borderWidth", "symbols": ["number", "borderWidth$ebnf$1"], "postprocess": combineClockwiseShorthand('border', undefined, 'Width') }, { "name": "borderColor$ebnf$1", "symbols": [] }, { "name": "borderColor$ebnf$1$subexpression$1", "symbols": ["_", "color"] }, { "name": "borderColor$ebnf$1", "symbols": ["borderColor$ebnf$1$subexpression$1", "borderColor$ebnf$1"], "postprocess": function arrconcat(d) {
        return [d[0]].concat(d[1]);
      } }, { "name": "borderColor", "symbols": ["color", "borderColor$ebnf$1"], "postprocess": combineClockwiseShorthand('border', undefined, 'Color') }, { "name": "borderRadius$ebnf$1", "symbols": [] }, { "name": "borderRadius$ebnf$1$subexpression$1", "symbols": ["_", "number"] }, { "name": "borderRadius$ebnf$1", "symbols": ["borderRadius$ebnf$1$subexpression$1", "borderRadius$ebnf$1"], "postprocess": function arrconcat(d) {
        return [d[0]].concat(d[1]);
      } }, { "name": "borderRadius", "symbols": ["number", "borderRadius$ebnf$1"], "postprocess": combineClockwiseShorthand('border', ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'], 'Radius')
    }, { "name": "flexFlowFlexWrap$subexpression$1$string$1", "symbols": [{ "literal": "n" }, { "literal": "o" }, { "literal": "w" }, { "literal": "r" }, { "literal": "a" }, { "literal": "p" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "flexFlowFlexWrap$subexpression$1", "symbols": ["flexFlowFlexWrap$subexpression$1$string$1"] }, { "name": "flexFlowFlexWrap$subexpression$1$string$2", "symbols": [{ "literal": "w" }, { "literal": "r" }, { "literal": "a" }, { "literal": "p" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "flexFlowFlexWrap$subexpression$1", "symbols": ["flexFlowFlexWrap$subexpression$1$string$2"] }, { "name": "flexFlowFlexWrap$subexpression$1$string$3", "symbols": [{ "literal": "w" }, { "literal": "r" }, { "literal": "a" }, { "literal": "p" }, { "literal": "-" }, { "literal": "r" }, { "literal": "e" }, { "literal": "v" }, { "literal": "e" }, { "literal": "r" }, { "literal": "s" }, { "literal": "e" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "flexFlowFlexWrap$subexpression$1", "symbols": ["flexFlowFlexWrap$subexpression$1$string$3"] }, { "name": "flexFlowFlexWrap", "symbols": ["flexFlowFlexWrap$subexpression$1"], "postprocess": text }, { "name": "flexFlowFlexDirection$subexpression$1$string$1", "symbols": [{ "literal": "r" }, { "literal": "o" }, { "literal": "w" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "flexFlowFlexDirection$subexpression$1", "symbols": ["flexFlowFlexDirection$subexpression$1$string$1"] }, { "name": "flexFlowFlexDirection$subexpression$1$string$2", "symbols": [{ "literal": "r" }, { "literal": "o" }, { "literal": "w" }, { "literal": "-" }, { "literal": "r" }, { "literal": "e" }, { "literal": "v" }, { "literal": "e" }, { "literal": "r" }, { "literal": "s" }, { "literal": "e" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "flexFlowFlexDirection$subexpression$1", "symbols": ["flexFlowFlexDirection$subexpression$1$string$2"] }, { "name": "flexFlowFlexDirection$subexpression$1$string$3", "symbols": [{ "literal": "c" }, { "literal": "o" }, { "literal": "l" }, { "literal": "u" }, { "literal": "m" }, { "literal": "n" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "flexFlowFlexDirection$subexpression$1", "symbols": ["flexFlowFlexDirection$subexpression$1$string$3"] }, { "name": "flexFlowFlexDirection$subexpression$1$string$4", "symbols": [{ "literal": "c" }, { "literal": "o" }, { "literal": "l" }, { "literal": "u" }, { "literal": "m" }, { "literal": "n" }, { "literal": "-" }, { "literal": "r" }, { "literal": "e" }, { "literal": "v" }, { "literal": "e" }, { "literal": "r" }, { "literal": "s" }, { "literal": "e" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "flexFlowFlexDirection$subexpression$1", "symbols": ["flexFlowFlexDirection$subexpression$1$string$4"] }, { "name": "flexFlowFlexDirection", "symbols": ["flexFlowFlexDirection$subexpression$1"], "postprocess": text }, { "name": "flexFlow$macrocall$2", "symbols": ["flexFlowFlexWrap"] }, { "name": "flexFlow$macrocall$3", "symbols": ["flexFlowFlexDirection"] }, { "name": "flexFlow$macrocall$1$macrocall$2", "symbols": ["flexFlow$macrocall$2"] }, { "name": "flexFlow$macrocall$1$macrocall$3", "symbols": ["flexFlow$macrocall$3"] }, { "name": "flexFlow$macrocall$1$macrocall$1", "symbols": ["flexFlow$macrocall$1$macrocall$2", "__", "flexFlow$macrocall$1$macrocall$3"], "postprocess": function postprocess(d) {
        return [d[0][0][0], d[2][0][0]];
      } }, { "name": "flexFlow$macrocall$1$macrocall$1", "symbols": ["flexFlow$macrocall$1$macrocall$3", "__", "flexFlow$macrocall$1$macrocall$2"], "postprocess": function postprocess(d) {
        return [d[2][0][0], d[0][0][0]];
      } }, { "name": "flexFlow$macrocall$1", "symbols": ["flexFlow$macrocall$1$macrocall$1"], "postprocess": at(0) }, { "name": "flexFlow$macrocall$1", "symbols": ["flexFlow$macrocall$2"], "postprocess": function postprocess(d) {
        return [d[0][0], null];
      } }, { "name": "flexFlow$macrocall$1", "symbols": ["flexFlow$macrocall$3"], "postprocess": function postprocess(d) {
        return [null, d[0][0]];
      } }, { "name": "flexFlow", "symbols": ["flexFlow$macrocall$1"], "postprocess": function postprocess(d) {
        return { $merge: {
            flexWrap: defaultOptional(d[0][0], 'nowrap'),
            flexDirection: defaultOptional(d[0][1], 'row')
          } };
      } }, { "name": "flex$ebnf$1", "symbols": [] }, { "name": "flex$ebnf$1$subexpression$1", "symbols": ["_", "number"] }, { "name": "flex$ebnf$1", "symbols": ["flex$ebnf$1$subexpression$1", "flex$ebnf$1"], "postprocess": function arrconcat(d) {
        return [d[0]].concat(d[1]);
      } }, { "name": "flex", "symbols": ["number", "flex$ebnf$1"], "postprocess": function postprocess(d, location, reject) {
        var values = combineHeadTail(d);
        if (values.length > 3) return reject;

        var _values2 = _slicedToArray(values, 3),
            flexGrow = _values2[0],
            _values2$ = _values2[1],
            flexShrink = _values2$ === undefined ? 1 : _values2$,
            _values2$2 = _values2[2],
            flexBasis = _values2$2 === undefined ? 0 : _values2$2;

        return { $merge: { flexGrow: flexGrow, flexShrink: flexShrink, flexBasis: flexBasis } };
      } }, { "name": "fontFontStyle$subexpression$1$string$1", "symbols": [{ "literal": "n" }, { "literal": "o" }, { "literal": "r" }, { "literal": "m" }, { "literal": "a" }, { "literal": "l" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "fontFontStyle$subexpression$1", "symbols": ["fontFontStyle$subexpression$1$string$1"] }, { "name": "fontFontStyle$subexpression$1$string$2", "symbols": [{ "literal": "i" }, { "literal": "t" }, { "literal": "a" }, { "literal": "l" }, { "literal": "i" }, { "literal": "c" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "fontFontStyle$subexpression$1", "symbols": ["fontFontStyle$subexpression$1$string$2"] }, { "name": "fontFontStyle", "symbols": ["fontFontStyle$subexpression$1"], "postprocess": text }, { "name": "fontFontVariantCss21$string$1", "symbols": [{ "literal": "n" }, { "literal": "o" }, { "literal": "r" }, { "literal": "m" }, { "literal": "a" }, { "literal": "l" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "fontFontVariantCss21", "symbols": ["fontFontVariantCss21$string$1"], "postprocess": function postprocess() {
        return [];
      } }, { "name": "fontFontVariantCss21$string$2", "symbols": [{ "literal": "s" }, { "literal": "m" }, { "literal": "a" }, { "literal": "l" }, { "literal": "l" }, { "literal": "-" }, { "literal": "c" }, { "literal": "a" }, { "literal": "p" }, { "literal": "s" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "fontFontVariantCss21", "symbols": ["fontFontVariantCss21$string$2"], "postprocess": function postprocess() {
        return ['small-caps'];
      } }, { "name": "fontFontWeight$subexpression$1$string$1", "symbols": [{ "literal": "n" }, { "literal": "o" }, { "literal": "r" }, { "literal": "m" }, { "literal": "a" }, { "literal": "l" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "fontFontWeight$subexpression$1", "symbols": ["fontFontWeight$subexpression$1$string$1"] }, { "name": "fontFontWeight$subexpression$1$string$2", "symbols": [{ "literal": "b" }, { "literal": "o" }, { "literal": "l" }, { "literal": "d" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "fontFontWeight$subexpression$1", "symbols": ["fontFontWeight$subexpression$1$string$2"] }, { "name": "fontFontWeight$subexpression$1$string$3", "symbols": [{ "literal": "0" }, { "literal": "0" }], "postprocess": function joiner(d) {
        return d.join('');
      } }, { "name": "fontFontWeight$subexpression$1", "symbols": [/[1-9]/, "fontFontWeight$subexpression$1$string$3"] }, { "name": "fontFontWeight", "symbols": ["fontFontWeight$subexpression$1"], "postprocess": text }, { "name": "fontFontFamily$ebnf$1", "symbols": [] }, { "name": "fontFontFamily$ebnf$1$subexpression$1", "symbols": [{ "literal": "\\" }, /./] }, { "name": "fontFontFamily$ebnf$1$subexpression$1", "symbols": [/[^"]/] }, { "name": "fontFontFamily$ebnf$1", "symbols": ["fontFontFamily$ebnf$1$subexpression$1", "fontFontFamily$ebnf$1"], "postprocess": function arrconcat(d) {
        return [d[0]].concat(d[1]);
      } }, { "name": "fontFontFamily", "symbols": [{ "literal": "\"" }, "fontFontFamily$ebnf$1", { "literal": "\"" }], "postprocess": function postprocess(d) {
        return text(d[1]);
      } }, { "name": "fontFontFamily$ebnf$2", "symbols": [] }, { "name": "fontFontFamily$ebnf$2$subexpression$1", "symbols": [{ "literal": "\\" }, /./] }, { "name": "fontFontFamily$ebnf$2$subexpression$1", "symbols": [/[^']/] }, { "name": "fontFontFamily$ebnf$2", "symbols": ["fontFontFamily$ebnf$2$subexpression$1", "fontFontFamily$ebnf$2"], "postprocess": function arrconcat(d) {
        return [d[0]].concat(d[1]);
      } }, { "name": "fontFontFamily", "symbols": [{ "literal": "'" }, "fontFontFamily$ebnf$2", { "literal": "'" }], "postprocess": function postprocess(d) {
        return text(d[1]);
      } }, { "name": "font$macrocall$2", "symbols": ["fontFontStyle"] }, { "name": "font$macrocall$3", "symbols": ["fontFontVariantCss21"] }, { "name": "font$macrocall$4", "symbols": ["fontFontWeight"] }, { "name": "font$macrocall$1$ebnf$1$macrocall$2", "symbols": ["font$macrocall$2"] }, { "name": "font$macrocall$1$ebnf$1$macrocall$3", "symbols": ["font$macrocall$3"] }, { "name": "font$macrocall$1$ebnf$1$macrocall$4", "symbols": ["font$macrocall$4"] }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$2", "symbols": ["font$macrocall$1$ebnf$1$macrocall$2"] }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$3", "symbols": ["font$macrocall$1$ebnf$1$macrocall$3"] }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$4", "symbols": ["font$macrocall$1$ebnf$1$macrocall$4"] }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$2", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$3"] }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$3", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$4"] }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$1", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$2", "__", "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$3"], "postprocess": function postprocess(d) {
        return [d[0][0][0], d[2][0][0]];
      } }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$1", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$3", "__", "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$2"], "postprocess": function postprocess(d) {
        return [d[2][0][0], d[0][0][0]];
      } }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$2", "__", "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$1"], "postprocess": combineAnyOrder(0) }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$5", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$2"] }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$6", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$4"] }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$4", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$5", "__", "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$6"], "postprocess": function postprocess(d) {
        return [d[0][0][0], d[2][0][0]];
      } }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$4", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$6", "__", "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$5"], "postprocess": function postprocess(d) {
        return [d[2][0][0], d[0][0][0]];
      } }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$3", "__", "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$4"], "postprocess": combineAnyOrder(1) }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$8", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$2"] }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$9", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$3"] }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$7", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$8", "__", "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$9"], "postprocess": function postprocess(d) {
        return [d[0][0][0], d[2][0][0]];
      } }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$7", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$9", "__", "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$8"], "postprocess": function postprocess(d) {
        return [d[2][0][0], d[0][0][0]];
      } }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$4", "__", "font$macrocall$1$ebnf$1$macrocall$1$macrocall$1$macrocall$7"], "postprocess": combineAnyOrder(2) }, { "name": "font$macrocall$1$ebnf$1$macrocall$1", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$1"], "postprocess": function postprocess(d) {
        return d[0].map(at(0));
      } }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$6", "symbols": ["font$macrocall$1$ebnf$1$macrocall$2"] }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$7", "symbols": ["font$macrocall$1$ebnf$1$macrocall$3"] }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$5", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$6", "__", "font$macrocall$1$ebnf$1$macrocall$1$macrocall$7"], "postprocess": function postprocess(d) {
        return [d[0][0][0], d[2][0][0]];
      } }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$5", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$7", "__", "font$macrocall$1$ebnf$1$macrocall$1$macrocall$6"], "postprocess": function postprocess(d) {
        return [d[2][0][0], d[0][0][0]];
      } }, { "name": "font$macrocall$1$ebnf$1$macrocall$1", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$5"], "postprocess": function postprocess(d) {
        return [d[0][0], d[0][1], null];
      } }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$9", "symbols": ["font$macrocall$1$ebnf$1$macrocall$2"] }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$10", "symbols": ["font$macrocall$1$ebnf$1$macrocall$4"] }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$8", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$9", "__", "font$macrocall$1$ebnf$1$macrocall$1$macrocall$10"], "postprocess": function postprocess(d) {
        return [d[0][0][0], d[2][0][0]];
      } }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$8", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$10", "__", "font$macrocall$1$ebnf$1$macrocall$1$macrocall$9"], "postprocess": function postprocess(d) {
        return [d[2][0][0], d[0][0][0]];
      } }, { "name": "font$macrocall$1$ebnf$1$macrocall$1", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$8"], "postprocess": function postprocess(d) {
        return [d[0][0], null, d[0][1]];
      } }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$12", "symbols": ["font$macrocall$1$ebnf$1$macrocall$3"] }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$13", "symbols": ["font$macrocall$1$ebnf$1$macrocall$4"] }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$11", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$12", "__", "font$macrocall$1$ebnf$1$macrocall$1$macrocall$13"], "postprocess": function postprocess(d) {
        return [d[0][0][0], d[2][0][0]];
      } }, { "name": "font$macrocall$1$ebnf$1$macrocall$1$macrocall$11", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$13", "__", "font$macrocall$1$ebnf$1$macrocall$1$macrocall$12"], "postprocess": function postprocess(d) {
        return [d[2][0][0], d[0][0][0]];
      } }, { "name": "font$macrocall$1$ebnf$1$macrocall$1", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1$macrocall$11"], "postprocess": function postprocess(d) {
        return [null, d[0][0], d[0][1]];
      } }, { "name": "font$macrocall$1$ebnf$1$macrocall$1", "symbols": ["font$macrocall$1$ebnf$1$macrocall$2"], "postprocess": function postprocess(d) {
        return [d[0][0], null, null];
      } }, { "name": "font$macrocall$1$ebnf$1$macrocall$1", "symbols": ["font$macrocall$1$ebnf$1$macrocall$3"], "postprocess": function postprocess(d) {
        return [null, d[0][0], null];
      } }, { "name": "font$macrocall$1$ebnf$1$macrocall$1", "symbols": ["font$macrocall$1$ebnf$1$macrocall$4"], "postprocess": function postprocess(d) {
        return [null, null, d[0][0]];
      } }, { "name": "font$macrocall$1$ebnf$1", "symbols": ["font$macrocall$1$ebnf$1$macrocall$1"], "postprocess": id }, { "name": "font$macrocall$1$ebnf$1", "symbols": [], "postprocess": function postprocess(d) {
        return null;
      } }, { "name": "font$macrocall$1", "symbols": ["font$macrocall$1$ebnf$1"], "postprocess": function postprocess(d) {
        return d[0] ? d[0].map(at(0)) : [null, null, null];
      } }, { "name": "font$ebnf$1$subexpression$1", "symbols": ["_", { "literal": "/" }, "_", "number"] }, { "name": "font$ebnf$1", "symbols": ["font$ebnf$1$subexpression$1"], "postprocess": id }, { "name": "font$ebnf$1", "symbols": [], "postprocess": function postprocess(d) {
        return null;
      } }, { "name": "font", "symbols": ["font$macrocall$1", "_", "number", "font$ebnf$1", "__", "fontFontFamily"], "postprocess": function postprocess(d) {
        var options = {
          fontStyle: defaultOptional(d[0][0], 'normal'),
          fontVariant: defaultOptional(d[0][1], []),
          fontWeight: defaultOptional(d[0][2], 'normal'),
          fontSize: d[2],
          fontFamily: d[5]
        };
        // In CSS, line-height defaults to normal, but we can't set it to that
        var lineHeight = d[3] && d[3][3];
        if (lineHeight) options.lineHeight = lineHeight;

        return { $merge: options };
      } }],
    ParserStart: "number"
  };
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = grammar;
  } else {
    window.grammar = grammar;
  }
})();