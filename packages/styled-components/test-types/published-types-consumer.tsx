import * as React from 'react';
import styled, { type StyledComponent, ServerStyleSheet } from 'styled-components';

/**
 * Consumer-side contract for the published declarations. `test:types:dist`
 * (`scripts/typeCheckDist.mjs`) compiles this against the built `dist` under
 * every supported `@types/react` target with no `@types/node` and
 * `skipLibCheck: false`; `test:types` never sees it, since that suite runs the
 * pinned version against `src`.
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

<Box as="section" id="box" style={{ '--gap': '1rem' }} />;

// @ts-expect-error `as` keeps the component's own props, so an unknown prop is rejected
<Box as="section" notAProp="x" />;

const Annotated: StyledComponent<'div', { $tone?: string }> = styled.div<{ $tone?: string }>``;

<Annotated $tone="warm" id="annotated" />;

// @ts-expect-error an annotated component still rejects an unknown prop
<Annotated notAProp="x" />;

/** The stream parameter is declared by the package itself, so no Node typings are needed to name it. */
declare const stream: Parameters<ServerStyleSheet['interleaveWithNodeStream']>[0];
new ServerStyleSheet().interleaveWithNodeStream(stream);

const ref = React.createRef<HTMLDivElement>();

<Box ref={ref} />;
