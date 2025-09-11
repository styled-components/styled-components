import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';
import withTheme from '../../hoc/withTheme';
import { resetStyled } from '../../test/utils';
import { DataAttributes } from '../../types';
import ThemeProvider, { useTheme } from '../ThemeProvider';

let styled: ReturnType<typeof resetStyled>;

describe('ThemeProvider', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  it('should not throw an error when no children are passed', () => {
    render(<ThemeProvider theme={{}} />);
  });

  it("should accept a theme prop that's a plain object", () => {
    render(<ThemeProvider theme={{ main: 'black' }} />);
  });

  it('should render its child', () => {
    const child = <p>Child!</p>;
    const wrapper = render(<ThemeProvider theme={{ main: 'black' }}>{child}</ThemeProvider>);

    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  it('should merge its theme with an outer theme', () => {
    const outerTheme = { main: 'black' };
    const innerTheme = { secondary: 'black' };

    const MyDiv = styled.div.attrs<DataAttributes>(p => ({
      'data-theme': JSON.stringify(p.theme),
    }))``;
    const MyDivWithTheme = withTheme(MyDiv);

    const wrapper = render(
      <ThemeProvider theme={outerTheme}>
        <ThemeProvider theme={innerTheme}>
          <MyDivWithTheme data-testid="subject" />
        </ThemeProvider>
      </ThemeProvider>
    );

    expect(wrapper.getByTestId('subject')).toHaveAttribute(
      'data-theme',
      JSON.stringify({
        ...outerTheme,
        ...innerTheme,
      })
    );
  });

  it('should merge its theme with multiple outer themes', () => {
    const outerestTheme = { main: 'black' };
    const outerTheme = { main: 'blue' };
    const innerTheme = { secondary: 'black' };

    const MyDiv = styled.div.attrs<DataAttributes>(p => ({
      'data-theme': JSON.stringify(p.theme),
    }))``;
    const MyDivWithTheme = withTheme(MyDiv);

    const wrapper = render(
      <ThemeProvider theme={outerestTheme}>
        <ThemeProvider theme={outerTheme}>
          <ThemeProvider theme={innerTheme}>
            <MyDivWithTheme data-testid="subject" />
          </ThemeProvider>
        </ThemeProvider>
      </ThemeProvider>
    );

    expect(wrapper.getByTestId('subject')).toHaveAttribute(
      'data-theme',
      JSON.stringify({
        ...outerestTheme,
        ...outerTheme,
        ...innerTheme,
      })
    );
  });

  it('should be able to render two independent themes', () => {
    const themes = {
      one: { main: 'black', secondary: 'red' },
      two: { main: 'blue', other: 'green' },
    };

    const MyDivOne = withTheme(
      styled.div.attrs<DataAttributes>(p => ({ 'data-theme': JSON.stringify(p.theme) }))``
    );
    const MyDivWithThemeOne = withTheme(MyDivOne);
    const MyDivTwo = withTheme(
      styled.div.attrs<DataAttributes>(p => ({ 'data-theme': JSON.stringify(p.theme) }))``
    );
    const MyDivWithThemeTwo = withTheme(MyDivTwo);

    const wrapper = render(
      <div>
        <ThemeProvider theme={themes.one}>
          <MyDivWithThemeOne data-testid="subject-one" />
        </ThemeProvider>
        <ThemeProvider theme={themes.two}>
          <MyDivWithThemeTwo data-testid="subject-two" />
        </ThemeProvider>
      </div>
    );

    expect(wrapper.getByTestId('subject-one')).toHaveAttribute(
      'data-theme',
      JSON.stringify(themes.one)
    );
    expect(wrapper.getByTestId('subject-two')).toHaveAttribute(
      'data-theme',
      JSON.stringify(themes.two)
    );
  });

  it('ThemeProvider propagates theme updates through nested ThemeProviders', () => {
    const theme = { themed: true };
    const augment = (outerTheme: typeof theme) =>
      Object.assign({}, outerTheme, { augmented: true });
    const update = { updated: true };
    const expected = { themed: true, updated: true, augmented: true };

    const MyDiv = styled.div.attrs<DataAttributes>(p => ({
      'data-theme': JSON.stringify(p.theme),
    }))``;
    const MyDivWithTheme = withTheme(MyDiv);

    const getJSX = (givenTheme = theme) => (
      <ThemeProvider theme={givenTheme}>
        <ThemeProvider theme={augment}>
          <MyDivWithTheme data-testid="subject" />
        </ThemeProvider>
      </ThemeProvider>
    );

    const wrapper = render(getJSX());

    wrapper.rerender(getJSX(Object.assign({}, theme, update)));

    expect(wrapper.getByTestId('subject')).toHaveAttribute('data-theme', JSON.stringify(expected));
  });
});

describe('useTheme', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  it('useTheme should get the same theme that is serving ThemeProvider', () => {
    const mainTheme = { main: 'black' };

    const MyDivOne = withTheme(
      styled.div.attrs<DataAttributes>(p => ({ 'data-theme': JSON.stringify(p.theme) }))``
    );
    const MyDivWithThemeOne = withTheme(MyDivOne);
    const MyDivWithThemeContext = (props: React.PropsWithChildren) => {
      const theme = useTheme();
      return <div data-theme={JSON.stringify(theme)} {...props} />;
    };

    const wrapper = render(
      <div>
        <ThemeProvider theme={mainTheme}>
          <React.Fragment>
            <MyDivWithThemeOne data-testid="subject-one" />
            <MyDivWithThemeContext data-testid="subject-context" />
          </React.Fragment>
        </ThemeProvider>
      </div>
    );

    expect(wrapper.getByTestId('subject-one')).toHaveAttribute(
      'data-theme',
      JSON.stringify(mainTheme)
    );
    expect(wrapper.getByTestId('subject-context')).toHaveAttribute(
      'data-theme',
      JSON.stringify(mainTheme)
    );
  });
});
