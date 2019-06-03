// @flow
const consoleError = console.error;

const suppressedErrors = [
  'Error: Could not parse CSS stylesheet',
  'Warning: Use the `defaultValue` or `value` props instead of setting children on <textarea>',
];

beforeEach(() => {
  // Suppress errors from JSDOM CSS parser
  // See: https://github.com/jsdom/jsdom/issues/2177
  // eslint-disable-next-line flowtype-errors/show-errors
  (console: any).error = message => {
    if (!suppressedErrors.some(suppressedError => message.includes(suppressedError))) {
      consoleError(message);
    }
  };
});

afterEach(() => {
  // eslint-disable-next-line flowtype-errors/show-errors
  (console: any).error = consoleError;
});
