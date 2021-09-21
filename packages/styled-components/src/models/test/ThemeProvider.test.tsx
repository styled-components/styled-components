/* eslint-disable react/no-multi-comp */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import withTheme from '../../hoc/withTheme';
import { expectCSSMatches, resetStyled } from '../../test/utils';
import ThemeProvider, { cssvar, MQ_THEME_KEY } from '../ThemeProvider';

let styled: ReturnType<typeof resetStyled>;

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
    const augment = (outerTheme: typeof theme) =>
      Object.assign({}, outerTheme, { augmented: true });
    const update = { updated: true };
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

  it('ThemeProvider emits the theme as CSS variables as well', () => {
    const wrapper = TestRenderer.create(
      <ThemeProvider
        theme={{
          [MQ_THEME_KEY]: { 'prefers-color-scheme: dark': { color: 'white' } },
          color: 'red',
          style: { background: 'blue' },
        }}
      >
        <div />
      </ThemeProvider>
    );

    expect(wrapper.toJSON()).toMatchInlineSnapshot(`
Array [
  <style
    dangerouslySetInnerHTML={
      Object {
        "__html": ":root{--sc-color: red;--sc-style-background: blue;}@media (prefers-color-scheme: dark){:root{--sc-color: white;}}
",
      }
    }
  />,
  <div />,
]
`);
  });

  it('css variable synthesis emits media query variants properly', () => {
    const wrapper = TestRenderer.create(
      <ThemeProvider theme={{ color: 'red', style: { background: 'blue' } }}>
        <div />
      </ThemeProvider>
    );

    expect(wrapper.toJSON()).toMatchInlineSnapshot(`
  Array [
    <style
      dangerouslySetInnerHTML={
        Object {
          "__html": ":root{--sc-color: red;--sc-style-background: blue;}",
        }
      }
    />,
    <div />,
  ]
  `);
  });

  it('cssvar helper accesses theme properties correctly', () => {
    const theme = { color: 'red', style: { background: 'blue' } };

    const MyDiv = styled.div`
      color: ${cssvar<typeof theme>('color')};
    `;

    const wrapper = TestRenderer.create(
      <ThemeProvider theme={theme}>
        <MyDiv />
      </ThemeProvider>
    );

    expectCSSMatches('.b { color:var(--sc-color); }');
    expect(wrapper.toJSON()).toMatchInlineSnapshot(`
Array [
  <style
    dangerouslySetInnerHTML={
      Object {
        "__html": ":root{--sc-color: red;--sc-style-background: blue;}",
      }
    }
  />,
  <div
    className="sc-a b"
  />,
]
`);
  });
});
