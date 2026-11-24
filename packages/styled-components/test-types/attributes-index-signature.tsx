/**
 * Compiled by its own project (tsconfig.test-attributes-index.json): the `declare
 * module 'react'` below is program-wide, so it cannot share a program with the
 * rest of the type suite (docs/typescript-performance.md, "Testing the type surface").
 * That tsconfig sets `"jsx": "react-jsx"` because augmenting `React.Attributes`
 * flows into `JSX.IntrinsicAttributes`, under which classic `"jsx": "react"`
 * fails with TS2322 on `<>...</>` fragments in imported `src/` files.
 *
 * A `data-*` template-literal index on `React.Attributes` reaches every
 * intrinsic element through its ref and key half. A probe that keys
 * `HTMLAttributes` alone misses it and reports TS2590, as in #5796.
 */
import React from 'react';
import styled, { IStyledComponent } from '../src';
import { FastOmit } from '../src/types';

declare module 'react' {
  interface Attributes {
    [dataAttribute: `data-${string}`]: string | undefined;
  }
}

const Example = styled.div``;

<Example data-role="test" style={{ '--accent': 'tomato' }} />;

// @ts-expect-error an unknown prop is still rejected under the augmentation
<Example thisPropDoesNotExist="nope" />;

// @ts-expect-error data attribute values retain the augmented string type
const invalidAttrs: React.Attributes = { 'data-role': 42 };
void invalidAttrs;

const Tiny = styled.div``;
const Wide = styled.div``;

const Conditional = ({ tiny }: { tiny: boolean }) => {
  const Wrapper = tiny ? Tiny : Wide;
  return <Wrapper data-role="conditional" style={{ '--accent': 'tomato' }} />;
};

<Conditional tiny />;

type DivProps = React.JSX.IntrinsicElements['div'];

const Annotated: IStyledComponent<'web', FastOmit<DivProps, never> & { $a?: number }> = styled.div<{
  $a?: number;
}>``;

void Annotated;
