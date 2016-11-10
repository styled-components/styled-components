// Generated automatically by nearley
// http://github.com/Hardmath123/nearley
(function () {
function id(x) {return x[0]; }

  const at = index => d => d[index];
  const text = d => d.join('');

  const transformShorthand = (fn, arg1, optionalArg) => {
    const arg2 = optionalArg ? optionalArg[2] : arg1;
    return [
      { [`${fn}X`]: arg1 },
      { [`${fn}Y`]: arg2 },
    ];
  };

  const combine = ([head, tail]) => {
    return head;
    const tailValues = tail.reduce((accum, value) => (
      accum.concat(value[1])
    ), []);
    return [].concat(head, tailValues);
  }


  const transformArg = d => ({ [d[0].join('')]: d[2][0] });
var grammar = {
    ParserRules: [
    {"name": "number$subexpression$1$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "number$subexpression$1$ebnf$1", "symbols": [/[0-9]/, "number$subexpression$1$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "number$subexpression$1", "symbols": ["number$subexpression$1$ebnf$1"]},
    {"name": "number", "symbols": ["number$subexpression$1"], "postprocess": d => Number(d[0])},
    {"name": "angle$subexpression$1$string$1", "symbols": [{"literal":"d"}, {"literal":"e"}, {"literal":"g"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "angle$subexpression$1", "symbols": ["angle$subexpression$1$string$1"]},
    {"name": "angle$subexpression$1$string$2", "symbols": [{"literal":"r"}, {"literal":"a"}, {"literal":"d"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "angle$subexpression$1", "symbols": ["angle$subexpression$1$string$2"]},
    {"name": "angle", "symbols": ["number", "angle$subexpression$1"], "postprocess": text},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": [/[ \t\n\r]/, "_$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": () => null},
    {"name": "main", "symbols": ["number"], "postprocess": d => d},
    {"name": "transformPart$subexpression$1$string$1", "symbols": [{"literal":"p"}, {"literal":"e"}, {"literal":"r"}, {"literal":"s"}, {"literal":"p"}, {"literal":"e"}, {"literal":"c"}, {"literal":"t"}, {"literal":"i"}, {"literal":"v"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "transformPart$subexpression$1", "symbols": ["transformPart$subexpression$1$string$1"]},
    {"name": "transformPart$subexpression$1$string$2", "symbols": [{"literal":"s"}, {"literal":"c"}, {"literal":"a"}, {"literal":"l"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "transformPart$subexpression$1$ebnf$1", "symbols": ["XY"], "postprocess": id},
    {"name": "transformPart$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "transformPart$subexpression$1", "symbols": ["transformPart$subexpression$1$string$2", "transformPart$subexpression$1$ebnf$1"]},
    {"name": "transformPart$subexpression$1$string$3", "symbols": [{"literal":"t"}, {"literal":"r"}, {"literal":"a"}, {"literal":"n"}, {"literal":"s"}, {"literal":"l"}, {"literal":"a"}, {"literal":"t"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "transformPart$subexpression$1", "symbols": ["transformPart$subexpression$1$string$3", "XY"]},
    {"name": "transformPart$macrocall$2", "symbols": ["number"]},
    {"name": "transformPart$macrocall$1", "symbols": [{"literal":"("}, "_", "transformPart$macrocall$2", "_", {"literal":")"}], "postprocess": at(2)},
    {"name": "transformPart", "symbols": ["transformPart$subexpression$1", "_", "transformPart$macrocall$1"], "postprocess": transformArg},
    {"name": "transformPart$subexpression$2$string$1", "symbols": [{"literal":"r"}, {"literal":"o"}, {"literal":"t"}, {"literal":"a"}, {"literal":"t"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "transformPart$subexpression$2$ebnf$1", "symbols": ["XYZ"], "postprocess": id},
    {"name": "transformPart$subexpression$2$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "transformPart$subexpression$2", "symbols": ["transformPart$subexpression$2$string$1", "transformPart$subexpression$2$ebnf$1"]},
    {"name": "transformPart$subexpression$2$string$2", "symbols": [{"literal":"s"}, {"literal":"c"}, {"literal":"a"}, {"literal":"l"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "transformPart$subexpression$2$ebnf$2", "symbols": ["XY"], "postprocess": id},
    {"name": "transformPart$subexpression$2$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "transformPart$subexpression$2", "symbols": ["transformPart$subexpression$2$string$2", "transformPart$subexpression$2$ebnf$2"]},
    {"name": "transformPart$subexpression$2$string$3", "symbols": [{"literal":"s"}, {"literal":"k"}, {"literal":"e"}, {"literal":"w"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "transformPart$subexpression$2", "symbols": ["transformPart$subexpression$2$string$3", "XY"]},
    {"name": "transformPart$macrocall$4", "symbols": ["angle"]},
    {"name": "transformPart$macrocall$3", "symbols": [{"literal":"("}, "_", "transformPart$macrocall$4", "_", {"literal":")"}], "postprocess": at(2)},
    {"name": "transformPart", "symbols": ["transformPart$subexpression$2", "_", "transformPart$macrocall$3"], "postprocess": transformArg},
    {"name": "XY", "symbols": [{"literal":"X"}]},
    {"name": "XY", "symbols": [{"literal":"Y"}]},
    {"name": "XYZ", "symbols": ["XY"]},
    {"name": "XYZ", "symbols": [{"literal":"Z"}]}
]
  , ParserStart: "main"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
