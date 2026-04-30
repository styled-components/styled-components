import { SC_ATTR as DEFAULT_SC_ATTR } from '../constants';
import { expectCSSMatches } from './utils';

describe('constants', () => {
  afterEach(() => {
    jest.resetModules();
  });

  describe('SC_ATTR', () => {
    function renderAndExpect(expectedAttr: string) {
      const React = require('react');
      const { flushSync } = require('react-dom');
      const ReactDOM = require('react-dom/client');
      const { SC_ATTR } = require('../constants');
      const styled = require('./utils').resetStyled();

      const Comp = styled.div`
        color: blue;
      `;

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOM.createRoot(container);
      flushSync(() => {
        root.render(<Comp />);
      });

      expectCSSMatches('.b { color:blue; }');

      expect(SC_ATTR).toEqual(expectedAttr);
      expect(document.head.querySelectorAll(`style[${SC_ATTR}]`)).toHaveLength(1);

      root.unmount();
      document.body.removeChild(container);
    }

    it('should work with default SC_ATTR', () => {
      renderAndExpect(DEFAULT_SC_ATTR);
    });

    it('should work with custom SC_ATTR', () => {
      const CUSTOM_SC_ATTR = 'data-custom-styled-components';
      process.env.SC_ATTR = CUSTOM_SC_ATTR;
      jest.resetModules();

      renderAndExpect(CUSTOM_SC_ATTR);

      delete process.env.SC_ATTR;
    });

    it('should work with REACT_APP_SC_ATTR', () => {
      const REACT_APP_CUSTOM_SC_ATTR = 'data-custom-react_app-styled-components';
      process.env.REACT_APP_SC_ATTR = REACT_APP_CUSTOM_SC_ATTR;
      jest.resetModules();

      renderAndExpect(REACT_APP_CUSTOM_SC_ATTR);

      delete process.env.REACT_APP_SC_ATTR;
    });
  });
});
