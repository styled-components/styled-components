import React from 'react';
import TestRenderer, { ReactTestInstance } from 'react-test-renderer';

import withTheme from '../../hoc/withTheme';
import ThemeProvider from '../../models/ThemeProvider';
import { resetStyled } from '../../test/utils';
import useTheme from '../useTheme';

let styled: ReturnType<typeof resetStyled>;

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
      return <div data-theme={theme} />;
    };

    const wrapper = TestRenderer.create(
      <div>
        <ThemeProvider theme={mainTheme}>
          <React.Fragment>
            <MyDivWithThemeOne />
            <MyDivWithThemeContext />
          </React.Fragment>
        </ThemeProvider>
      </div>
    );

    expect(wrapper.root.findByType(MyDivOne).props.theme).toEqual(mainTheme);
    expect(
      (wrapper.root.findByType(MyDivWithThemeContext).children[0] as ReactTestInstance).props[
        'data-theme'
      ]
    ).toEqual(mainTheme);
  });
});
