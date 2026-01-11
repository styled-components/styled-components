const stylis = require('./node_modules/stylis/dist/umd/stylis.js');

function testStylis(description, css) {
  console.log(`\n=== ${description} ===`);
  console.log('Input:', JSON.stringify(css));
  try {
    const compiled = stylis.compile(`.test { ${css} }`);
    const stack = [];
    stylis.serialize(compiled, stylis.middleware([stylis.stringify, stylis.rulesheet(value => stack.push(value))]));
    console.log('Output:', stack);
  } catch (e) {
    console.log('Error:', e.message);
  }
}

// Original issue - extra closing brace
testStylis('Extra closing brace in value (original issue)',
  `width: 100px;
   line-height: 14px}";
   background-color: green;`);

// Extra opening brace
testStylis('Extra opening brace in value',
  `width: 100px;
   content: "{test";
   background-color: green;`);

// Unclosed string (missing closing quote)  
testStylis('Unclosed double quote string',
  `width: 100px;
   content: "unclosed;
   background-color: green;`);

// Unclosed single quote string
testStylis('Unclosed single quote string',
  `width: 100px;
   content: 'unclosed;
   background-color: green;`);

// Unclosed url()
testStylis('Unclosed url parenthesis',
  `width: 100px;
   background: url(test.png;
   background-color: green;`);

// Unclosed calc()
testStylis('Unclosed calc parenthesis',
  `width: 100px;
   height: calc(100% - 10px;
   background-color: green;`);

// Missing colon in declaration
testStylis('Missing colon',
  `width: 100px;
   height 50px;
   background-color: green;`);

// Double colon in declaration
testStylis('Double colon',
  `width: 100px;
   height:: 50px;
   background-color: green;`);

// Extra semicolon (should be harmless)
testStylis('Extra semicolon',
  `width: 100px;;
   background-color: green;`);

// Nested braces in valid CSS (e.g., @media)
testStylis('Valid nested braces (@media)',
  `width: 100px;
   @media (min-width: 500px) {
     color: blue;
   }
   background-color: green;`);

// Multiple extra closing braces
testStylis('Multiple extra closing braces',
  `width: 100px;
   content: "}}";
   background-color: green;`);

// Extra brace after valid declaration - no quotes
testStylis('Extra brace after valid declaration - no quotes',
  `width: 100px;
   height: 50px}
   background-color: green;`);

// Valid content with braces inside string
testStylis('Valid braces inside string',
  `width: 100px;
   content: "}";
   background-color: green;`);
