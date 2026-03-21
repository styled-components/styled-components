/**
 * @jest-environment node
 */

jest.mock('../../constants', () => ({
  ...jest.requireActual('../../constants'),
  IS_RSC: true,
}));

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import styled from '../../constructors/styled';
import { mainSheet } from '../../models/StyleSheetManager';
import { resetGroupIds } from '../../sheet/GroupIDAllocator';

describe('checkDynamicCreation RSC mode', () => {
  beforeEach(() => {
    resetGroupIds();
    mainSheet.gs = {};
    mainSheet.names = new Map();
    mainSheet.clearTag();
  });

  it('does not warn when a styled component is created inside a render function', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    function App() {
      // Creating a styled component inside render is normally warned against
      const DynamicBox = styled.div`
        color: red;
      `;

      return React.createElement(DynamicBox);
    }

    const html = ReactDOMServer.renderToString(React.createElement(App));

    expect(html).toContain('color:red');
    // In RSC mode, the dynamic creation check is skipped entirely
    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
  });
});
