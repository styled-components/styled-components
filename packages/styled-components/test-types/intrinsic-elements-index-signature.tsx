import React from 'react';
import styled from '../src';

/**
 * A consumer (a UI kit, a codegen tool) can globally augment
 * `React.JSX.IntrinsicElements` with a string index signature, for example to
 * allow arbitrary custom-element tag names. `SupportedHTMLElements`
 * (`utils/domElements.ts`) narrows the runtime tag list with
 * `Extract<(typeof elements)[number], keyof React.JSX.IntrinsicElements>`,
 * and `keyof` an interface carrying a string index signature is `string`
 * (it absorbs every specific literal key), not the original literal union.
 * `Extract<T, string>` must still return `T` unchanged when every member of
 * `T` is itself a string literal, so the augmentation must neither drop a
 * known tag from `SupportedHTMLElements` nor widen a known tag's own props
 * (`TargetProps` resolves those by indexed access on the *explicit* member,
 * which co-exists with the index signature) to `any`.
 */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      [k: string]: any;
    }
  }
}

const Example = styled.div`
  color: red;
`;

<Example className="known-prop" />;

// @ts-expect-error styled.div's own props must not widen to `any`: an unknown
// prop is still rejected even once IntrinsicElements carries an index signature.
<Example thisPropDoesNotExist="nope" />;

// styled('search') and, since <search> is a real tag in the resolved
// @types/react here, the styled.search shorthand must both still resolve to
// the actual <search> element's props, not to the index signature's `any`.
const SearchByCall = styled('search')``;
const SearchByShorthand = styled.search``;

<SearchByCall className="known-prop" />;
<SearchByShorthand className="known-prop" />;

// @ts-expect-error same widening guard for the shorthand form
<SearchByShorthand thisPropDoesNotExist="nope" />;
