// @flow
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { resetStyled } from './utils';

let styled;

describe('sourceMap', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  it('should inject sourceMap', () => {
    const fakeSourceMap = '/* fake source map */';
    const Named1 = styled.div.withConfig({
      sourceMap: fakeSourceMap,
    })``;
    TestRenderer.create(<Named1 />);
    const allStyles = Array.from(document.querySelectorAll('style'))
      .map(tag => tag.innerHTML)
      .join('\n');
    expect(allStyles.includes(fakeSourceMap));
  });
});
