// @flow
/* eslint-disable react/no-multi-comp */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import StyledProvider from '../StyledProvider';
import withTheme from '../../hoc/withTheme';
import { resetStyled } from '../../test/utils';

let styled;

describe('StyledProvider', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  it('should not throw an error when no children are passed', () => {
    TestRenderer.create(<StyledProvider scope="" />);
  });

  it("should accept a scope prop that's a string", () => {
    TestRenderer.create(<StyledProvider scope=".scope" />);
  });

  it('should render its child', () => {
    const child = <p>Child!</p>;
    const wrapper = TestRenderer.create(<StyledProvider scope=".scope">{child}</StyledProvider>);

    expect(wrapper.toJSON()).toMatchSnapshot();
  });

  it('should scope styles to the prefix specified in the scope prop', () => {
    const MyDiv = styled.div``;
    const child = <MyDiv>Child!</MyDiv>;
    const wrapper = TestRenderer.create(<StyledProvider scope=".scope">{child}</StyledProvider>);

    expect(wrapper.toJSON()).toMatchSnapshot();
  });
});
