import React from 'react';

import { render } from '@testing-library/react';
import { resetStyled } from './utils';

describe('warns on dynamic creation', () => {
  let warn: ReturnType<typeof jest.spyOn>;
  let styled: ReturnType<typeof resetStyled>;

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    styled = resetStyled();
  });

  afterEach(() => {
    warn.mockReset();
  });

  it('should warn when a component was created dynamically', () => {
    const Outer = () => {
      const Inner = styled.div`
        color: palevioletred;
      `;

      return <Inner />;
    };

    render(<Outer />);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/has been created dynamically/i);
  });

  it('should warn only once for a given ID', () => {
    const Outer = () => {
      const Inner = styled.div.withConfig({
        displayName: 'Inner',
        componentId: 'Inner',
      })`
        color: palevioletred;
      `;

      return <Inner />;
    };

    render(<Outer />);
    render(<Outer />);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('should not warn in any other case', () => {
    const Inner = styled.div`
      color: palevioletred;
    `;

    const Outer = () => <Inner />;
    render(<Outer />);

    expect(warn).toHaveBeenCalledTimes(0);
  });

  it('should not warn in RSC environment even when called in what would be a render context', () => {
    jest.resetModules();
    
    const originalCreateContext = React.createContext;
    
    try {
      // Simulate RSC environment by removing createContext
      // @ts-expect-error mocking for RSC test
      delete React.createContext;

      // Re-import to get fresh IS_RSC value
      const { checkDynamicCreation } = require('../utils/checkDynamicCreation');
      
      // In RSC, this should not warn
      checkDynamicCreation('TestComponent', 'test-id');
      
      expect(warn).not.toHaveBeenCalled();
    } finally {
      // Restore React.createContext
      React.createContext = originalCreateContext;
    }
  });
});
