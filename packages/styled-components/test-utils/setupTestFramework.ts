import failOnConsole from 'jest-fail-on-console';

import { resetWarnOnce } from '../src/utils/warnOnce';

/**
 * Noise that is not under test, plus library warnings that suites trigger as
 * substrate while asserting something else (unknown-prop during attrs/CSS
 * tests, RSC client-reference interpolation, etc.). Warning *text* for those
 * library paths is locked in dedicated characterization tests that spy locally.
 * Matched as substrings against the util.format'd message.
 */
const silencedMessageSubstrings = [
  'Could not parse CSS stylesheet',
  'Use the `defaultValue` or `value` props instead of setting children on <textarea>',
  'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'is using incorrect casing.',
  'is unrecognized in this browser.',
  'React does not recognize the `',
  'Support for defaultProps will be removed from function components',
  'renderToNodeStream is deprecated',
  'HTMLCanvasElement.prototype.getContext',
  'not wrapped in act(...)',
  '[wpt] ',
  '[sc] unknown prop "',
  '[sc] interpolating a client component',
  '[sc] no ThemeProvider or theme prop in scope',
  'cannot be used as a React Native dimension',
];

/**
 * `jest-fail-on-console` records from the moment it patches `console`, including
 * test-file module evaluation. Fixture `styled(...)` at file scope then trips
 * the suite's `beforeAll` flush. Only capture once a test body is about to run.
 */
let captureConsole = false;

beforeEach(() => {
  captureConsole = true;
});

afterAll(() => {
  captureConsole = false;
});

failOnConsole({
  allowMessage: () => !captureConsole,
  shouldFailOnError: true,
  shouldFailOnWarn: true,
  silenceMessage: (message: string) =>
    silencedMessageSubstrings.some(fragment => message.includes(fragment)),
  /**
   * Native transform / animation / snap suites exercise `warnOnce` as substrate
   * (platform limits, invalid tokens). Warning text is locked in dedicated
   * characterization spies (devWarn, per-rule blocks). All other suites still
   * fail on unexpected warn/error leaks.
   */
  skipTest: ({ testPath }) => {
    if (typeof testPath !== 'string') return false;
    if (/\/src\/native\/(transform|animation)\//.test(testPath)) return true;
    return /\/src\/native\/test\/(snap-offsets|snap-settle|anchor-positioning|modern-css)\.test\./.test(
      testPath
    );
  },
});

beforeEach(() => {
  // The shared `warnOnce` dedupe Set persists across tests; reset so each
  // assertion that expects a warning to fire actually sees it.
  resetWarnOnce();
});
