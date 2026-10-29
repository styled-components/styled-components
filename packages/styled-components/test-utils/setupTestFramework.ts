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
  // Load here, not at module scope. A top-level import would cache the real
  // id helper before a test file mocks `generateAlphabeticName`, and every
  // generated class name in that file would stop being sequential.
  // Function-bodied global styles take a per-process count. Restart it so
  // each test starts from zero and the first call keeps a stable id.
  const { resetGlobalStyleComponentIds } = require('../src/utils/globalStyleId') as {
    resetGlobalStyleComponentIds: () => void;
  };
  resetGlobalStyleComponentIds();

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
});

afterEach(() => {
  console.error = consoleError;
});
