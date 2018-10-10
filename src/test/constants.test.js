// @flow
import React from 'react';
import TestRenderer from 'react-test-renderer';

import { expectCSSMatches } from './utils';
import { SC_ATTR as DEFAULT_SC_ATTR } from '../constants';

function renderAndExpect(expectedAttr) {
  const { SC_ATTR } = require('../constants');
  const styled = require('./utils').resetStyled();

  const Comp = styled.div`
    color: blue;
  `;

  TestRenderer.create(<Comp />);

  expectCSSMatches('.sc-a { } .b { color:blue; }');

  expect(SC_ATTR).toEqual(expectedAttr);
  expect(document.head.querySelectorAll(`style[${SC_ATTR}]`)).toHaveLength(1);
}

afterEach(jest.resetModules);

describe('constants', () => {
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

  describe('DISABLE_SPEEDY', () => {
    it('defaults to true in development / testing', () => {
      const { DISABLE_SPEEDY } = require('../constants');

      expect(DISABLE_SPEEDY).toBe(true);
    });

    it('is true if a SC_DISABLE_SPEEDY env variable is set', () => {
      process.env.SC_DISABLE_SPEEDY = 'true';
      const { DISABLE_SPEEDY } = require('../constants');

      expect(DISABLE_SPEEDY).toBe(true);

      delete process.env.SC_DISABLE_SPEEDY;
    });

    it('is false in production', () => {
      process.env.NODE_ENV = 'production';
      const { DISABLE_SPEEDY } = require('../constants');

      expect(DISABLE_SPEEDY).toBe(false);
    });
  });
});
