import React from 'react';
import styled from '../src';

/**
 * A `data-*` template-literal index on `React.Attributes` reaches every
 * intrinsic element through its ref and key half. A probe that keys
 * `HTMLAttributes` alone misses it and reports TS2590, as in #5796.
 */
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
