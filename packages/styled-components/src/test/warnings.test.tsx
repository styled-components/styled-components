import React from 'react';
import { render } from '@testing-library/react';
import { LIMIT } from '../utils/createWarnTooManyClasses';
import { resetStyled } from './utils';

describe('dynamic creation warnings', () => {
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
      // @ts-expect-error mocking for RSC test
      delete React.createContext;

      const { checkDynamicCreation } = require('../utils/checkDynamicCreation');

      checkDynamicCreation('TestComponent', 'test-id');

      expect(warn).not.toHaveBeenCalled();
    } finally {
      React.createContext = originalCreateContext;
    }
  });

  describe('RSC mode', () => {
    it('does not warn when a styled component is created inside a render function', () => {
      jest.resetModules();

      jest.doMock('../utils/isRsc', () => ({ IS_RSC: true }));

      jest.isolateModules(() => {
        const ReactDOMServer = require('react-dom/server');
        const styledMod = require('../constructors/styled');
        const styledFn = styledMod.default || styledMod;
        const { mainSheet } = require('../models/StyleSheetManager');
        const { resetGroupIds } = require('../sheet/GroupIDAllocator');

        resetGroupIds();
        mainSheet.names = new Map();
        mainSheet.clearTag();

        function App() {
          const DynamicBox = styledFn.div`
            color: red;
          `;

          return React.createElement(DynamicBox);
        }

        ReactDOMServer.renderToString(React.createElement(App));

        expect(warn).not.toHaveBeenCalled();
      });
    });
  });
});

describe('too many classes warnings', () => {
  let styled: ReturnType<typeof resetStyled>;

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
