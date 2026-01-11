const COMMENT_REGEX = /^\s*\/\/.*$/gm;

const css = `
      width: 100px;
      height: 100px;
      border-radius: 50%;
      line-height: 14px}"; /* Simulates: () => "14px}" - syntax error with extra } */
      background-color: green;
    `;

console.log('Original:', JSON.stringify(css));
console.log('After comment removal:', JSON.stringify(css.replace(COMMENT_REGEX, '')));
