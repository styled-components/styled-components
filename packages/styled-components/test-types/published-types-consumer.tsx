import * as React from 'react';
import styled, { type IStyledComponent, ServerStyleSheet } from 'styled-components';

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
 * every 16.x and 17.x and from 18.2.6-18.2.11. There the shorthand, the call
 * form and an `.attrs()` redirect accept any prop, as released; a version that
 * declares the tag types its props. The `as` prop keeps the component's own props
 * on every version. See docs/type-performance.md, "Tags missing from older
 * @types/react".
 */
const Search = styled.search`
  display: block;
`;
const SearchByCall = styled('search')``;
const DivAsSearch = styled.div.attrs({ as: 'search' })``;
const searchRef = React.createRef<HTMLElement>();

<Search role="search" aria-label="Site" ref={searchRef} style={{ '--gap': '1rem' }} />;
<SearchByCall role="search" />;
<DivAsSearch role="search" />;
<Box as="search" role="search" />;

// @ts-expect-error `as` keeps the component's own props, so an unknown prop is rejected
<Box as="search" notAProp="x" />;

/**
 * Accepting any prop shows as a string index in the component's prop bag. The
 * pins compile only when that index is present exactly where the resolved
 * `@types/react` lacks the `<search>` intrinsic. The controls keep the probe
 * honest: a custom element is permissive on every version, a `div` never is.
 */
type AcceptsAnyProp<C> =
  C extends IStyledComponent<'web', infer P> ? (string extends keyof P ? true : false) : 'no match';
type SearchUndeclared = 'search' extends keyof React.JSX.IntrinsicElements ? false : true;
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const pin = <_T extends true>(): void => {};

pin<Same<AcceptsAnyProp<typeof Search>, SearchUndeclared>>();
pin<Same<AcceptsAnyProp<typeof SearchByCall>, SearchUndeclared>>();
pin<Same<AcceptsAnyProp<typeof DivAsSearch>, SearchUndeclared>>();

const CustomElement = styled('custom-element')``;

pin<Same<AcceptsAnyProp<typeof CustomElement>, true>>();
pin<Same<AcceptsAnyProp<typeof Box>, false>>();
