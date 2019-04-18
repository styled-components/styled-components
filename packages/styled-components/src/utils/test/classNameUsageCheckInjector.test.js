// @flow
import React from 'react';
import ReactDOM from 'react-dom';
import { renderIntoDocument } from 'react-dom/test-utils';
import { resetStyled } from '../../test/utils';

let styled;

describe.skip('classNameUsageCheckInjector', () => {
  beforeEach(() => {
    styled = resetStyled();
  });
  
  it('should generate valid selectors when there are some line break in className', () => {
    const div = document.createElement('div');
    const Comp = props => <div {...props} />;
    const StyledComp = styled(Comp)``;

    // Avoid the console.warn
    jest.spyOn(div, 'querySelector').mockImplementationOnce(() => true);
    jest.spyOn(ReactDOM, 'findDOMNode').mockImplementationOnce(() => div);

    renderIntoDocument(
      <StyledComp
        className="   foo
        bar  "
      />
    );

    const [selector] = div.querySelector.mock.calls[0];

    // Css selectors should not have multiple dots after each other
    expect(selector).not.toMatch(/\.{2,}/);
    expect(selector).toMatch(/^\.foo\.bar\.sc-/);
  });
  
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
  });

  it('does not show duplicate warnings', () => {
    const Comp1 = () => <div />;
    const StyledComp1 = styled(Comp1)``;
    const Comp2 = () => <div />;
    const StyledComp2 = styled(Comp2)``;

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

  it('does not warn for correct usage of styled(Comp)', () => {
    const Comp1 = props => <div {...props} />;
    const StyledComp1 = styled(Comp1)``;

    const Comp2 = props => (
      <div>
        <Comp1 {...props} />
      </div>
    );
    const StyledComp2 = styled(Comp2)``;

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
