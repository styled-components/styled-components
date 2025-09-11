import React from 'react';

import { render } from '@testing-library/react';
import { LIMIT } from '../utils/createWarnTooManyClasses';
import { resetStyled } from './utils';

let styled: ReturnType<typeof resetStyled>;

describe('warn too many classes', () => {
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    styled = resetStyled();
  });

  it('should warn once', () => {
    const Comp = styled.div<{ size: number }>`
      width: ${props => props.size};
    `;

    for (let i = 0; i < LIMIT + 1; i++) {
      render(<Comp size={i} />);
    }

    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it(`should warn if number of classes is ${LIMIT}`, () => {
    const Comp = styled.div<{ size: number }>`
      width: ${props => props.size};
    `;

    for (let i = 0; i < LIMIT; i++) {
      render(<Comp size={i} />);
    }

    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it(`should not warn if number of classes is below ${LIMIT}`, () => {
    const Comp = styled.div<{ size: number }>`
      width: ${props => props.size};
    `;

    for (let i = 0; i < LIMIT - 1; i++) {
      render(<Comp size={i} />);
    }

    expect(console.warn).toHaveBeenCalledTimes(0);
  });
});
