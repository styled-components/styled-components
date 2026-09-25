import styled, { ServerStyleSheet } from 'styled-components';

/**
 * Consumer-side contract for the published declarations. `test:types:dist`
 * (`scripts/typeCheckDist.mjs`) compiles this against the built `dist` under
 * every supported `@types/react` target; `test:types` never sees it, since that
 * suite only runs the pinned version against `src`.
 *
 * Every `@ts-expect-error` here doubles as a presence anchor: if the types
 * degraded to `any` on some target, the directive goes unused (TS2578) and the
 * run fails.
 */

const Box = styled.div`
  color: red;
`;

<Box id="box" />;

// @ts-expect-error an unknown prop on an intrinsic tag is rejected
<Box notAProp="x" />;

declare const nodeStream: NodeJS.ReadableStream;
new ServerStyleSheet().interleaveWithNodeStream(nodeStream);
