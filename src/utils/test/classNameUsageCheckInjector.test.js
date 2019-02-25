// @flow
import React from 'react';
import ReactDOM from 'react-dom';
import { renderIntoDocument } from 'react-dom/test-utils';
import { resetPlaceable } from '../../test/utils';

let placeable;

describe('classNameUsageCheckInjector', () => {
  beforeEach(() => {
    placeable = resetPlaceable();
  });

  it('should generate valid selectors', () => {
    const div = document.createElement('div');
    const StyledDiv = placeable.div``;

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
    const StyledComp = placeable(Comp)``;

    jest.spyOn(console, 'warn').mockImplementation(() => {});

    renderIntoDocument(
      <div>
        <StyledComp />
        <StyledComp suppressClassNameWarning />
      </div>
    );

    expect(console.warn.mock.calls.length).toBe(1);
  });

  it('does not show duplicate warnings', () => {
    const Comp1 = () => <div />;
    const StyledComp1 = placeable(Comp1)``;
    const Comp2 = () => <div />;
    const StyledComp2 = placeable(Comp2)``;

    jest.spyOn(console, 'warn').mockImplementation(() => {});

    renderIntoDocument(
      <div>
        <StyledComp1 />
        <StyledComp1 />
        <StyledComp1 />
        <StyledComp2 />
        <StyledComp2 />
      </div>
    );

    expect(console.warn.mock.calls.length).toEqual(2);
  });

  it('does not warn for correct usage of placeable(Comp)', () => {
    const Comp1 = props => <div {...props} />;
    const StyledComp1 = placeable(Comp1)``;

    const Comp2 = props => <div><Comp1 {...props} /></div>;
    const StyledComp2 = placeable(Comp2)``;

    jest.spyOn(console, 'warn').mockImplementation(() => {});

    renderIntoDocument(
      <div>
        <StyledComp1 />
        <StyledComp2 />
      </div>
    );

    expect(console.warn.mock.calls.length).toEqual(0);
  });
});
