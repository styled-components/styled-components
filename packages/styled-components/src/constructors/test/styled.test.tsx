import React, { ComponentProps } from 'react';
import TestRenderer from 'react-test-renderer';
import { getRenderedCSS, resetStyled } from '../../test/utils';
import domElements from '../../utils/domElements';

let styled: ReturnType<typeof resetStyled>;

describe('styled', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  it('should have all valid HTML5 elements defined as properties', () => {
    domElements.forEach(domElement => {
      expect(styled[domElement]).toBeTruthy();
    });
  });

  it('should expose the component static attribute like components', () => {
    const CollapseComponent = (props: ComponentProps<'div'>) => {
      return <div {...props} />;
    };

    const Panel = (props: ComponentProps<'div'>) => {
      return <div {...props} />;
    };

    const Collapse = Object.assign(CollapseComponent, { Panel, PI: '3.14' });

    const StyledCollapse = styled(Collapse)`
      background: red;
    `;

    expect(Collapse).toBeTruthy();
    expect(Collapse.Panel).toBeTruthy();
    expect(Collapse.PI).toBe('3.14');

    expect(StyledCollapse).toBeTruthy();
    expect(StyledCollapse.Panel).toBeTruthy();
    expect(StyledCollapse.PI).toBe('3.14');

    TestRenderer.create(<StyledCollapse />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
    ".b {
      background: red;
    }"
    `);
  });
});
