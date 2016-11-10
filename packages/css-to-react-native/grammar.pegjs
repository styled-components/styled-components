{
  const transformShorthand = (fn, arg1, optionalArg) => {
    const arg2 = optionalArg ? optionalArg[2] : arg1;
    return [
      { [`${fn}X`]: arg1 },
      { [`${fn}Y`]: arg2 },
    ];
  };

  const combine = ([head, tail]) => {
    const tailValues = tail.reduce((accum, value) => (
      accum.concat(value[1])
    ), []);
    return [].concat(head, tailValues);
  }
}

FontWeight
  = value:$(.*) { return value; }

FontVariant
  = head:$([a-z-]i+) tail:(_ $([a-z-]i+))* {
      return combine(head, tail);
    }

ShadowOffset
  = arg1:Number optionalArg:(_ Number)? {
      const arg2 = optionalArg ? optionalArg[1] : arg1;
      return { width: arg1, height: arg2 };
    }

Transform
  = head:TransformPart tail:(_ TransformPart)* {
      return combine(head, tail).reverse();
    }

TransformPart
  // Note that "scale" exists as a shorthand when x == y
  = fn:("perspective" / $("scale" XY?) / $("translate" XY)) _
    "(" _ arg:Number _ ")" {
      return { [fn]: arg };
    }
  / fn:($("rotate" XYZ?) / $("skew" XY)) _
    "(" _ arg:Angle _ ")" {
      return { [fn]: arg };
    }
  / fn:("scale" / "translate") _
  	"(" _ arg1:Number _ optionalArg:("," _ Number _)? ")" {
   	  return transformShorthand(fn, arg1, optionalArg);
    }
  / fn:("skew") _
  	"(" _ arg1:Angle _ optionalArg:("," _ Angle _)? ")" {
   	  return transformShorthand(fn, arg1, optionalArg);
    }

XY
  = "X" / "Y"

XYZ
  = "X" / "Y" / "Z"

Number
  = [0-9]+ { return Number(text()); }

Angle
  = $(Number ("deg" / "rad"))

_ "whitespace"
  = [ \t\n\r]*
