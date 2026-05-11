import { resetWarnOnce } from '../src/utils/warnOnce';

const consoleError = console.error;

const suppressedErrors = [
  'Error: Could not parse CSS stylesheet',
  'Warning: Use the `defaultValue` or `value` props instead of setting children on <textarea>',
  'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'Warning: <%s /> is using incorrect casing.',
  'Warning: The tag <%s> is unrecognized in this browser.',
  'Warning: React does not recognize the `%s` prop on a DOM element.',
  'Warning: %s: Support for defaultProps will be removed from function components in a future major release. Use JavaScript default parameters instead.',
  'Warning: renderToNodeStream is deprecated. Use renderToPipeableStream instead.',
];

beforeEach(() => {
  // Suppress errors from JSDOM CSS parser
  // See: https://github.com/jsdom/jsdom/issues/2177
  console.error = jest.fn((logged: any) => {
    const message = logged.stack || logged;

    if (
      typeof message !== 'string' ||
      !suppressedErrors.some(suppressedError => message.includes(suppressedError))
    ) {
      consoleError(logged);
    }
  });

  // The shared `warnOnce` dedupe Set persists across tests; reset so each
  // assertion that expects a warning to fire actually sees it.
  resetWarnOnce();
});

afterEach(() => {
  console.error = consoleError;
});
