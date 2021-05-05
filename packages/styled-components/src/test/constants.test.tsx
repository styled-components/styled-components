/* eslint-disable global-require, @typescript-eslint/no-var-requires */
import { SC_ATTR as DEFAULT_SC_ATTR, SC_ATTR_ACTIVE as DEFAULT_SC_ATTR_ACTIVE } from '../constants';
import { expectCSSMatches } from './utils';

declare global {
  namespace NodeJS {
    export interface ProcessEnv {
      REACT_APP_SC_DISABLE_SPEEDY?: boolean | string;
      SC_DISABLE_SPEEDY?: boolean | string;
    }
  }

  interface Window {
    REACT_APP_SC_DISABLE_SPEEDY?: boolean | string;
    SC_DISABLE_SPEEDY?: boolean | string;
  }
}

describe('constants', () => {
  afterEach(() => {
    jest.resetModules();
  });

  describe('SC_ATTR', () => {
    function renderAndExpect(expectedAttr: string) {
      const React = require('react');
      const TestRenderer = require('react-test-renderer');
      const { SC_ATTR } = require('../constants');
      const styled = require('./utils').resetStyled();

      const Comp = styled.div`
        color: blue;
      `;

      TestRenderer.create(<Comp />);

      expectCSSMatches('.b { color:blue; }');

      expect(SC_ATTR).toEqual(expectedAttr);
      expect(document.head.querySelectorAll(`style[${SC_ATTR}]`)).toHaveLength(1);
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

  describe('DISABLE_SPEEDY', () => {
    function renderAndExpect(expectedDisableSpeedy: boolean, expectedCss: string) {
      const React = require('react');
      const TestRenderer = require('react-test-renderer');
      const { DISABLE_SPEEDY } = require('../constants');
      const styled = require('./utils').resetStyled();

      const Comp = styled.div`
        color: blue;
      `;

      TestRenderer.create(<Comp />);

      expect(DISABLE_SPEEDY).toEqual(expectedDisableSpeedy);
      expectCSSMatches(expectedCss);
    }

    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = 'test';
      delete process.env.DISABLE_SPEEDY;
      delete window.SC_DISABLE_SPEEDY;
    });

    it('should be false in production NODE_ENV when SC_DISABLE_SPEEDY is not set', () => {
      renderAndExpect(false, '');
    });

    it('should be false in production NODE_ENV when window.SC_DISABLE_SPEEDY is set to false', () => {
      window.SC_DISABLE_SPEEDY = false;
      renderAndExpect(false, '');
    });

    it('should be false in development NODE_ENV when window.SC_DISABLE_SPEEDY is set to false', () => {
      process.env.NODE_ENV = 'development';
      window.SC_DISABLE_SPEEDY = false;
      renderAndExpect(false, '');
    });

    it('should be false in production NODE_ENV when window.SC_DISABLE_SPEEDY is set to truthy value', () => {
      window.SC_DISABLE_SPEEDY = 'true';
      renderAndExpect(false, '');
    });

    it('should be true in production NODE_ENV when window.SC_DISABLE_SPEEDY is set to true', () => {
      window.SC_DISABLE_SPEEDY = true;
      renderAndExpect(true, '.b { color:blue; }');
    });

    it('should be true in test NODE_ENV', () => {
      process.env.NODE_ENV = 'test';
      renderAndExpect(true, '.b { color:blue; }');
    });

    it('should be true in development NODE_ENV', () => {
      process.env.NODE_ENV = 'development';
      renderAndExpect(true, '.b { color:blue; }');
    });

    it('should work with SC_DISABLE_SPEEDY environment variable', () => {
      process.env.SC_DISABLE_SPEEDY = true;
      renderAndExpect(true, '.b { color:blue; }');

      delete process.env.SC_DISABLE_SPEEDY;
    });

    it('should work with SC_DISABLE_SPEEDY environment variable when set to `false` in development NODE_ENV', () => {
      process.env.NODE_ENV = 'development';
      process.env.SC_DISABLE_SPEEDY = false;
      renderAndExpect(false, '');

      delete process.env.SC_DISABLE_SPEEDY;
    });

    it('should work with SC_DISABLE_SPEEDY environment variable when set to "false" in development NODE_ENV', () => {
      process.env.NODE_ENV = 'development';
      process.env.SC_DISABLE_SPEEDY = 'false';
      renderAndExpect(false, '');

      delete process.env.SC_DISABLE_SPEEDY;
    });

    it('should work with REACT_APP_SC_DISABLE_SPEEDY environment variable', () => {
      process.env.REACT_APP_SC_DISABLE_SPEEDY = true;
      renderAndExpect(true, '.b { color:blue; }');

      delete process.env.REACT_APP_SC_DISABLE_SPEEDY;
    });

    it('should work with REACT_APP_SC_DISABLE_SPEEDY environment variable when set to `false` in development NODE_ENV', () => {
      process.env.NODE_ENV = 'development';
      process.env.REACT_APP_SC_DISABLE_SPEEDY = false;
      renderAndExpect(false, '');

      delete process.env.REACT_APP_SC_DISABLE_SPEEDY;
    });

    it('should work with REACT_APP_SC_DISABLE_SPEEDY environment variable when set to "false" in development NODE_ENV', () => {
      process.env.NODE_ENV = 'development';
      process.env.REACT_APP_SC_DISABLE_SPEEDY = 'false';
      renderAndExpect(false, '');

      delete process.env.REACT_APP_SC_DISABLE_SPEEDY;
    });
  });
  
  describe('SC_ATTR_ACTIVE', () => {
    function renderAndExpect(expectedAttr: string) {
      const React = require('react');
      const TestRenderer = require('react-test-renderer');
      const { SC_ATTR_ACTIVE } = require('../constants');
      const styled = require('./utils').resetStyled();

      const Comp = styled.div`
        color: blue;
      `;

      TestRenderer.create(<Comp />);

      expectCSSMatches('.b { color:blue; }');

      expect(SC_ATTR_ACTIVE).toEqual(expectedAttr);
      expect(document.head.querySelectorAll(`style[${DEFAULT_SC_ATTR}]=${expectedAttr}`)).toHaveLength(1);
    }

    it('should work with default SC_ATTR_ACTIVE', () => {
      renderAndExpect(DEFAULT_SC_ATTR_ACTIVE);
    });

    it('should work with custom SC_ATTR_ACTIVE', () => {
      const CUSTOM_SC_ATTR_ACTIVE = 'custom-active-value';
      process.env.SC_ATTR_ACTIVE = CUSTOM_SC_ATTR;
      jest.resetModules();

      renderAndExpect(CUSTOM_SC_ATTR_ACTIVE);

      delete process.env.SC_ATTR_ACTIVE;
    });

    it('should work with REACT_APP_CUSTOM_SC_ATTR_ACTIVE', () => {
      const REACT_APP_CUSTOM_SC_ATTR_ACTIVE = 'custom-active-value_react-app';
      process.env.REACT_APP_SC_ATTR_ACTIVE = REACT_APP_CUSTOM_SC_ATTR_ACTIVE;
      jest.resetModules();

      renderAndExpect(REACT_APP_CUSTOM_SC_ATTR_ACTIVE);

      delete process.env.REACT_APP_SC_ATTR_ACTIVE;
    });
  });
});
