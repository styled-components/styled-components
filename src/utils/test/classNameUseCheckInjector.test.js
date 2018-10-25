// @flow
import React from 'react';
import ReactDOM from 'react-dom';
import { renderIntoDocument } from 'react-dom/test-utils';
import styled from '../../constructors/styled';

describe('classNameUseCheckInjector', () => {
  it('should generate valid selectors', () => {
    const div = document.createElement('div');
    const StyledDiv = styled.div``;

    // Avoid the console.warn
    jest.spyOn(div, 'querySelector').mockImplementationOnce(() => true);
    jest.spyOn(ReactDOM, 'findDOMNode').mockImplementationOnce(() => div);

    renderIntoDocument(<StyledDiv className="   foo    bar  " />);

    const [selector] = div.querySelector.mock.calls[0];

    // Css selectors should not have multiple dots after each other
    expect(selector).not.toMatch(/\.{2,}/);
    expect(selector).toMatch(/^\.foo\.bar\.sc-/);

    ReactDOM.findDOMNode.mockRestore();
  });

  it('does not show a warning if suppressClassNameWarning is passed', () => {
    const Comp = () => <div />;
    const StyledComp = styled(Comp)``;

    jest.spyOn(console, 'warn').mockImplementation(() => {});

    renderIntoDocument(
      <div>
        <StyledComp />
        <StyledComp suppressClassNameWarning />
      </div>
    );

    expect(console.warn.mock.calls.length).toBe(1);
  })
});
