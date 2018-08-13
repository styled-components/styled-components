// @flow
/* eslint-disable react/no-multi-comp */
import React from 'react'
import { shallow, render, mount } from 'enzyme'
import ThemeProvider from '../ThemeProvider'
import withTheme from '../../hoc/withTheme'
import { resetStyled, expectCSSMatches } from '../../test/utils'

let styled

describe('ThemeProvider', () => {
  beforeEach(() => {
    styled = resetStyled()
  })

  it('should not throw an error when no children are passed', () => {
    const result = expect(() =>
      shallow(<ThemeProvider theme={{}} />)
    ).not.toThrow()
  })

  it("should accept a theme prop that's a plain object", () => {
    shallow(<ThemeProvider theme={{ main: 'black' }} />)
  })

  it('should render its child', () => {
    const child = <p>Child!</p>
    const wrapper = mount(
      <ThemeProvider theme={{ main: 'black' }}>{child}</ThemeProvider>
    )

    expect(wrapper.find('p').getElement()).toEqual(child)
  })

  it('should merge its theme with an outer theme', () => {
    const outerTheme = { main: 'black' }
    const innerTheme = { secondary: 'black' }

    const MyDiv = styled.div``
    const MyDivWithTheme = withTheme(MyDiv)

    const wrapper = mount(
      <ThemeProvider theme={outerTheme}>
        <ThemeProvider theme={innerTheme}>
          <MyDivWithTheme />
        </ThemeProvider>
      </ThemeProvider>
    )

    expect(wrapper.find(MyDiv).prop('theme')).toEqual({
      ...outerTheme,
      ...innerTheme,
    })
  })

  it('should merge its theme with multiple outer themes', () => {
    const outerestTheme = { main: 'black' }
    const outerTheme = { main: 'blue' }
    const innerTheme = { secondary: 'black' }

    const MyDiv = styled.div``
    const MyDivWithTheme = withTheme(MyDiv)

    const wrapper = mount(
      <ThemeProvider theme={outerestTheme}>
        <ThemeProvider theme={outerTheme}>
          <ThemeProvider theme={innerTheme}>
            <MyDivWithTheme />
          </ThemeProvider>
        </ThemeProvider>
      </ThemeProvider>
    )

    expect(wrapper.find(MyDiv).prop('theme')).toEqual({
      ...outerestTheme,
      ...outerTheme,
      ...innerTheme,
    })
  })

  it('should be able to render two independent themes', () => {
    const themes = {
      one: { main: 'black', secondary: 'red' },
      two: { main: 'blue', other: 'green' },
    }

    const MyDivOne = withTheme(styled.div``)
    const MyDivWithThemeOne = withTheme(MyDivOne)
    const MyDivTwo = withTheme(styled.div``)
    const MyDivWithThemeTwo = withTheme(MyDivTwo)

    const wrapper = mount(
      <div>
        <ThemeProvider theme={themes.one}>
          <MyDivWithThemeOne />
        </ThemeProvider>
        <ThemeProvider theme={themes.two}>
          <MyDivWithThemeTwo />
        </ThemeProvider>
      </div>
    )

    expect(wrapper.find(MyDivOne).prop('theme')).toEqual(themes.one)
    expect(wrapper.find(MyDivTwo).prop('theme')).toEqual(themes.two)
  })

  it('ThemeProvider propagates theme updates through nested ThemeProviders', () => {
    const theme = { themed: true }
    const augment = outerTheme =>
      Object.assign({}, outerTheme, { augmented: true })
    const update = { updated: true }
    let actual
    const expected = { themed: true, augmented: true, updated: true }

    const MyDiv = styled.div``
    const MyDivWithTheme = withTheme(MyDiv)

    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <ThemeProvider theme={augment}>
          <MyDivWithTheme />
        </ThemeProvider>
      </ThemeProvider>
    )

    wrapper.setProps({ theme: Object.assign({}, theme, update) })

    expect(wrapper.find(MyDiv).prop('theme')).toEqual(expected)
  })
})
