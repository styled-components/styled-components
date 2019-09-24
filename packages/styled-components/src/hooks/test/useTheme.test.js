// @flow
import React from 'react';
import TestRenderer from 'react-test-renderer';

import ThemeProvider from '../../models/ThemeProvider';
import withTheme from '../../hoc/withTheme';
import useTheme from '../useTheme';
import { resetStyled } from '../../test/utils';

let styled;

describe('useTheme', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  it('useTheme should get the same theme that is serving ThemeProvider', () => {
    const mainTheme = { main: 'black' };

    const MyDivOne = withTheme(styled.div``);
    const MyDivWithThemeOne = withTheme(MyDivOne);
    const MyDivWithThemeContext = () => {
      const theme = useTheme();
      return <div theme={theme} />;
    };

    const wrapper = TestRenderer.create(
      <div>
        <ThemeProvider theme={mainTheme}>
          <MyDivWithThemeOne />
          <MyDivWithThemeContext />
        </ThemeProvider>
      </div>
    );

    expect(wrapper.root.findByType(MyDivOne).props.theme).toEqual(mainTheme);
    expect(wrapper.root.findByType(MyDivWithThemeContext).children[0].props.theme).toEqual(mainTheme);
  });
});
