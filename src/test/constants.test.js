// @flow
import React from 'react';
import TestRenderer from 'react-test-renderer';

import { expectCSSMatches } from './utils';
import { SC_ATTR as DEFAULT_SC_ATTR } from '../constants';

describe('constants', () => {
  afterEach(() => {
    jest.resetModules();
  });

  describe('SC_ATTR', () => {
    function renderAndExpect(expectedAttr) {
      const SC_ATTR = require('../constants').SC_ATTR;
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
  });

  describe('DISABLE_SPEEDY', () => {
    function renderAndExpect(expectedDisableSpeedy, expectedCss) {
      const DISABLE_SPEEDY = require('../constants').DISABLE_SPEEDY;
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
    });

    it('should be false in production NODE_ENV when SC_DISABLE_SPEEDY is not set', () => {
      renderAndExpect(false, '');
    });

    it('should be false in production NODE_ENV when window.SC_DISABLE_SPEEDY is set to false', () => {
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
  });
});
