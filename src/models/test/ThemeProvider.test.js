// @flow
/* eslint-disable react/no-multi-comp */
import React from 'react'
import { shallow, render, mount } from 'enzyme'
import ThemeProvider, { ThemeConsumer } from '../ThemeProvider'

describe('ThemeProvider', () => {
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
    const childrenSpy = jest.fn()

    render(
      <ThemeProvider theme={outerTheme}>
        <ThemeProvider theme={innerTheme}>
          <ThemeConsumer>{childrenSpy}</ThemeConsumer>
        </ThemeProvider>
      </ThemeProvider>
    )

    expect(childrenSpy).toHaveBeenCalledTimes(1)
    expect(childrenSpy).toHaveBeenCalledWith({
      ...outerTheme,
      ...innerTheme,
    })
  })

  it('should merge its theme with multiple outer themes', () => {
    const outerestTheme = { main: 'black' }
    const outerTheme = { main: 'blue' }
    const innerTheme = { secondary: 'black' }
    const childrenSpy = jest.fn()

    render(
      <ThemeProvider theme={outerestTheme}>
        <ThemeProvider theme={outerTheme}>
          <ThemeProvider theme={innerTheme}>
            <ThemeConsumer>{childrenSpy}</ThemeConsumer>
          </ThemeProvider>
        </ThemeProvider>
      </ThemeProvider>
    )

    expect(childrenSpy).toHaveBeenCalledTimes(1)
    expect(childrenSpy).toHaveBeenCalledWith({
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
    const childrenSpy = jest.fn()

    render(
      <div>
        <ThemeProvider theme={themes.one}>
          <ThemeConsumer>{childrenSpy}</ThemeConsumer>
        </ThemeProvider>
        <ThemeProvider theme={themes.two}>
          <ThemeConsumer>{childrenSpy}</ThemeConsumer>
        </ThemeProvider>
      </div>
    )

    expect(childrenSpy).toHaveBeenCalledWith({ ...themes.one })
    expect(childrenSpy).toHaveBeenLastCalledWith({ ...themes.two })
    expect(childrenSpy).toHaveBeenCalledTimes(2)
  })

  it('ThemeProvider propagates theme updates through nested ThemeProviders', () => {
    const theme = { themed: true }
    const augment = outerTheme =>
      Object.assign({}, outerTheme, { augmented: true })
    const update = { updated: true }
    let actual
    const expected = { themed: true, augmented: true, updated: true }
    const childrenSpy = jest.fn()

    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <ThemeProvider theme={augment}>
          <ThemeConsumer>{childrenSpy}</ThemeConsumer>
        </ThemeProvider>
      </ThemeProvider>
    )

    wrapper.setProps({ theme: Object.assign({}, theme, update) })

    expect(childrenSpy).toHaveBeenCalledWith({
      themed: true,
      augmented: true,
    })
    expect(childrenSpy).toHaveBeenLastCalledWith({
      themed: true,
      augmented: true,
      updated: true,
    })
    expect(childrenSpy).toHaveBeenCalledTimes(2)
  })
})
