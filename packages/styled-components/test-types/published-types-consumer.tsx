import * as React from 'react';
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

/**
 * Every tag shorthand exists on every supported `@types/react`, including a tag
 * that version does not declare as a JSX intrinsic: `<search>` is missing from
 * every 16.x and 17.x and from 18.2.6-18.2.11. There the tag takes the props
 * later versions declare for it, those of a plain `HTMLElement`, through the
 * shorthand, the call form, an `as` prop, and an `.attrs()` redirect alike.
 */
const Search = styled.search`
  display: block;
`;
const searchRef = React.createRef<HTMLElement>();

<Search role="search" aria-label="Site" ref={searchRef} style={{ '--gap': '1rem' }} />;

// @ts-expect-error an unknown prop is rejected rather than accepted by a catch-all
<Search notAProp="x" />;

const SearchByCall = styled('search')``;

<SearchByCall role="search" />;

// @ts-expect-error the call form types the same props as the shorthand
<SearchByCall notAProp="x" />;

<Box as="search" role="search" />;

// @ts-expect-error `as` merges the same props, so an unknown prop is still rejected
<Box as="search" notAProp="x" />;

const DivAsSearch = styled.div.attrs({ as: 'search' })``;

<DivAsSearch role="search" />;

// @ts-expect-error the redirect merges the same props, so an unknown prop is still rejected
<DivAsSearch notAProp="x" />;
