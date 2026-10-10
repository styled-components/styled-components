/**
 * @jest-environment node
 */
import errorMap from '../../utils/errors';
import { makeStyleTag } from '../dom';

describe('makeStyleTag without a document', () => {
  it('throws the edge-runtime error instead of a ReferenceError', () => {
    expect(typeof document).toBe('undefined');
    expect(() => makeStyleTag()).toThrow(new Error(errorMap[20].trim()));
  });

  it('names the fix in the catalog text', () => {
    expect(errorMap[20]).toContain(
      "Remove `export const runtime = 'edge'`, or set it to `'nodejs'`"
    );
    expect(errorMap[20]).toContain("make sure server code resolves the package's server build");
  });
});
