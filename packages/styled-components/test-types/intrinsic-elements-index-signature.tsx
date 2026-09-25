import React from 'react';
import styled from '../src';

/**
 * A consumer (a UI kit, a codegen tool) can globally augment
 * `React.JSX.IntrinsicElements` with a string index signature, for example to
 * allow arbitrary custom-element tag names. `keyof` an interface carrying a
 * string index signature is `string`, which absorbs every specific literal key,
 * so every tag string now takes `TargetProps`' intrinsic arm. The augmentation
 * must still not widen a known tag's own props to `any`: `TargetProps` resolves
 * those by indexed access on the *explicit* member, which co-exists with the
 * index signature.
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
