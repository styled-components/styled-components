import React from 'react';
import styled from '../src';

declare module 'react' {
  interface HTMLAttributes<T> {
    [dataAttribute: `data-${string}`]: string | undefined;
  }
}

const Example = styled.div``;

<Example data-role="test" style={{ '--accent': 'tomato' }} />;

// @ts-expect-error data attribute values retain the augmented string type
const invalidAttrs: React.HTMLAttributes<HTMLDivElement> = { 'data-role': 42 };
