/**
 * @jest-environment node
 */

// jsdom's `document` cannot be removed, so the no-document case runs in the
// node environment, where an edge-runtime bundle would also find itself.
import errorMap from '../../utils/errors';
import { makeStyleTag } from '../dom';

describe('makeStyleTag without a document', () => {
  it('throws error 20 naming the edge runtime and the fix', () => {
    expect(typeof document).toBe('undefined');
    expect(() => makeStyleTag()).toThrow(errorMap[20].trim());
  });
});
