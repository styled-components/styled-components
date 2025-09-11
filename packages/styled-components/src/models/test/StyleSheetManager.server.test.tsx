/* @jest-environment node */

import React from 'react';
import { renderToString } from 'react-dom/server';
import styled from '../../constructors/styled';
import ServerStyleSheet from '../ServerStyleSheet';
import { StyleSheetManager } from '../StyleSheetManager';

describe('StyleSheetManager', () => {
  it('should use given stylesheet instance', () => {
    const serverStyles = new ServerStyleSheet();
    const Title = styled.h1`
      color: palevioletred;
    `;
    renderToString(
      <StyleSheetManager sheet={serverStyles.instance}>
        <Title />
      </StyleSheetManager>
    );
    expect(serverStyles.getStyleTags().includes(`palevioletred`)).toEqual(true);
  });
});
