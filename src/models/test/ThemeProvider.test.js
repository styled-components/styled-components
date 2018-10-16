// @flow
/* eslint-disable react/no-multi-comp */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import ThemeProvider from '../ThemeProvider';
import withTheme from '../../hoc/withTheme';
import { resetStyled } from '../../test/utils';

let styled;

describe('ThemeProvider', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  it('should not throw an error when no children are passed', () => {
    TestRenderer.create(<ThemeProvider theme={{}} />);
  });

  it("should accept a theme prop that's a plain object", () => {
    TestRenderer.create(<ThemeProvider theme={{ main: 'black' }} />);
  });

  it('should render its child', () => {
    const child = <p>Child!</p>;
    const wrapper = TestRenderer.create(
      <ThemeProvider theme={{ main: 'black' }}>{child}</ThemeProvider>
    );

    expect(wrapper.toJSON()).toMatchSnapshot();
  });

  it('should merge its theme with an outer theme', () => {
    const outerTheme = { main: 'black' };
    const innerTheme = { secondary: 'black' };

    const MyDiv = styled.div``;
    const MyDivWithTheme = withTheme(MyDiv);

    const wrapper = TestRenderer.create(
      <ThemeProvider theme={outerTheme}>
        <ThemeProvider theme={innerTheme}>
          <MyDivWithTheme />
        </ThemeProvider>
      </ThemeProvider>
    );

    expect(wrapper.root.findByType(MyDiv).props.theme).toEqual({
      ...outerTheme,
      ...innerTheme,
    });
  });

  it('should merge its theme with multiple outer themes', () => {
    const outerestTheme = { main: 'black' };
    const outerTheme = { main: 'blue' };
    const innerTheme = { secondary: 'black' };

    const MyDiv = styled.div``;
    const MyDivWithTheme = withTheme(MyDiv);

    const wrapper = TestRenderer.create(
      <ThemeProvider theme={outerestTheme}>
        <ThemeProvider theme={outerTheme}>
          <ThemeProvider theme={innerTheme}>
            <MyDivWithTheme />
          </ThemeProvider>
        </ThemeProvider>
      </ThemeProvider>
    );

    expect(wrapper.root.findByType(MyDiv).props.theme).toEqual({
      ...outerestTheme,
      ...outerTheme,
      ...innerTheme,
    });
  });

  it('should be able to render two independent themes', () => {
    const themes = {
      one: { main: 'black', secondary: 'red' },
      two: { main: 'blue', other: 'green' },
    };

    const MyDivOne = withTheme(styled.div``);
    const MyDivWithThemeOne = withTheme(MyDivOne);
    const MyDivTwo = withTheme(styled.div``);
    const MyDivWithThemeTwo = withTheme(MyDivTwo);

    const wrapper = TestRenderer.create(
      <div>
        <ThemeProvider theme={themes.one}>
          <MyDivWithThemeOne />
        </ThemeProvider>
        <ThemeProvider theme={themes.two}>
          <MyDivWithThemeTwo />
        </ThemeProvider>
      </div>
    );

    expect(wrapper.root.findByType(MyDivOne).props.theme).toEqual(themes.one);
    expect(wrapper.root.findByType(MyDivTwo).props.theme).toEqual(themes.two);
  });

  it('ThemeProvider propagates theme updates through nested ThemeProviders', () => {
    const theme = { themed: true };
    const augment = outerTheme => Object.assign({}, outerTheme, { augmented: true });
    const update = { updated: true };
    let actual;
    const expected = { themed: true, augmented: true, updated: true };

    const MyDiv = styled.div``;
    const MyDivWithTheme = withTheme(MyDiv);

    const getJSX = (givenTheme = theme) => (
      <ThemeProvider theme={givenTheme}>
        <ThemeProvider theme={augment}>
          <MyDivWithTheme />
        </ThemeProvider>
      </ThemeProvider>
    );

    const wrapper = TestRenderer.create(getJSX());

    wrapper.update(getJSX(Object.assign({}, theme, update)));

    expect(wrapper.root.findByType(MyDiv).props.theme).toEqual(expected);
  });
});
