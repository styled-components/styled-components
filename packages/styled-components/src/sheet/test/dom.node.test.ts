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
});
