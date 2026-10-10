/**
 * @jest-environment node
 */
import { makeStyleTag } from '../dom';

describe('makeStyleTag without a document', () => {
  it('throws the edge-runtime error instead of a ReferenceError', () => {
    expect(typeof document).toBe('undefined');
    expect(() => makeStyleTag()).toThrowErrorMatchingInlineSnapshot(
      `"styled-components tried to create a \`<style>\` element on the server, where no \`document\` exists. This happens when a route renders on the server with the edge runtime, which loads the browser build. Remove \`export const runtime = 'edge'\`, or set it to \`'nodejs'\`, on every route that renders styled-components on the server."`
    );
  });
});
