/**
 * Compiled by its own project (tsconfig.test-template-index.json): the `declare
 * module 'react'` below is program-wide, so it cannot share a program with the
 * rest of the type suite (docs/typescript-performance.md, "Testing the type surface").
 */
import React from 'react';
import styled, { IStyledComponent } from '../src';
import { FastOmit } from '../src/types';

declare module 'react' {
  interface HTMLAttributes<T> {
    [dataAttribute: `data-${string}`]: string | undefined;
  }
}

const Example = styled.div``;

<Example data-role="test" style={{ '--accent': 'tomato' }} />;

// @ts-expect-error data attribute values retain the augmented string type
const invalidAttrs: React.HTMLAttributes<HTMLDivElement> = { 'data-role': 42 };

/**
 * Conditionally selecting between two styled components produced TS2590 at the
 * JSX call site even with `skipLibCheck` on (#5796): the union of the two
 * component types re-ran the widening the declaration escaped. Rendering the
 * picked component must type-check.
 */
const Tiny = styled.div``;
const Wide = styled.div``;

const Conditional = ({ tiny }: { tiny: boolean }) => {
  const Wrapper = tiny ? Tiny : Wide;
  return <Wrapper data-role="conditional" style={{ '--accent': 'tomato' }} />;
};

<Conditional tiny />;

/**
 * The augmented intrinsic widening must keep an explicit declaration-site
 * annotation relatable.
 */
type DivProps = React.JSX.IntrinsicElements['div'];

const Annotated: IStyledComponent<'web', FastOmit<DivProps, never> & { $a?: number }> = styled.div<{
  $a?: number;
}>``;

void Annotated;
void invalidAttrs;
