// @flow
import errorMap from './errors';

const ERRORS = process.env.NODE_ENV !== 'production' ? errorMap : {};

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
export default function throwStyledComponentsError(
  code: string | number,
  ...interpolations: Array<any>
) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `An error occurred. See https://git.io/JUIaE#${code} for more information.${
        interpolations.length > 0 ? ` Args: ${interpolations.join(', ')}` : ''
      }`
    );
  } else {
    throw new Error(format(ERRORS[code], ...interpolations).trim());
  }
}
