import React from 'react';
import css from '../../constructors/css';
import styled from '../../constructors/styled';
import hoist from '../hoist';
import isStaticRules from '../isStaticRules';

describe('isStaticRules', () => {
  it.each<[string, (Box: ReturnType<typeof styled.div>) => object]>([
    ['a styled component', Box => Box],
    ['a function HOC that hoists its statics', Box => hoist(() => <Box />, Box)],
  ])('treats rules that refer to %s as static', (_label, wrap) => {
    const Box = styled.div``;

    expect(
      isStaticRules(css`
        ${wrap(Box)}:hover {
          color: red;
        }
      `)
    ).toBe(true);
  });

  it('treats rules with an interpolated function as dynamic', () => {
    expect(
      isStaticRules(css<{ $color: string }>`
        color: ${p => p.$color};
      `)
    ).toBe(false);
  });
});
