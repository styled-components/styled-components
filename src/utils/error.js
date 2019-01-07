// @flow

declare var preval: Function;

/**
 * Parse errors.md and turn it into a simple hash of code: message
 */
const ERRORS =
  process.env.NODE_ENV !== 'production'
    ? preval`
      const fs = require('fs');
      const md = fs.readFileSync(__dirname + '/errors.md', 'utf8');

      module.exports = md.split(/^#/gm).slice(1).reduce((errors, str) => {
        const [, code, message] = str.split(/^.*?(\\d+)\\s*\\n/)
        errors[code] = message

        return errors;
      }, {});
    `
    : {};

export function errorKeyFramesInNative() {
  throw new Error('`keyframes` cannot be used on ReactNative, only on the web. To do animation in ReactNative please use `Animated` https://bit.ly/2VzGVqs.')
};

/**
 * super basic version of sprintf
 */
function format(...args) {
  let a = args[0];
  const b = [];

  for (let c = 1, len = args.length; c < len; c += 1) {
    b.push(args[c]);
  }

  b.forEach(d => {
    a = a.replace(/%[a-z]/, d);
  });

  return a;
}

/**
 * Create an error file out of errors.md for development and a simple web link to the full errors
 * in production mode.
 */
export default class StyledComponentsError extends Error {
  constructor(code: string | number, ...interpolations: Array<any>) {
    if (process.env.NODE_ENV === 'production') {
      super(
        `An error occurred. See https://github.com/styled-components/styled-components/blob/master/src/utils/errors.md#${code} for more information. ${
          interpolations ? `Additional arguments: ${interpolations.join(', ')}` : ''
        }`
      );
    } else {
      super(format(ERRORS[code], ...interpolations).trim());
    }
  }
}
