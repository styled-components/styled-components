/**
 * @jest-environment node
 */

// jsdom's `document` cannot be removed, so the no-document case runs in the
// node environment, where an edge-runtime bundle would also find itself.
import { makeStyleTag } from '../dom';

describe('makeStyleTag without a document', () => {
  it('throws error 20 naming the edge runtime and the fix', () => {
    expect(typeof document).toBe('undefined');
    expect(() => makeStyleTag()).toThrow(
      "styled-components tried to create a `<style>` element on the server, where no `document` exists. This happens when a route renders on the server with the edge runtime, which loads the browser build. Remove `export const runtime = 'edge'`, or set it to `'nodejs'`, on every route that renders styled-components on the server."
    );
  });
});
