// @flow
import 'jest-dom/extend-expect'
import 'react-testing-library/cleanup-after-each'
import React from 'react'
import { render } from 'react-testing-library'
import ThemeProvider, { ThemeConsumer } from '../ThemeProvider'

describe('ThemeProvider', () => {
  it('should not throw an error when no children are passed', () => {
    expect(() => render(<ThemeProvider theme={{}} />)).not.toThrow()
  })

  it("should accept a theme prop that's a plain object", () => {
    expect(() =>
      render(<ThemeProvider theme={{ main: 'black' }} />)
    ).not.toThrow()
  })

  it('should render its child', () => {
    const { container, queryByTestId } = render(
      <ThemeProvider theme={{ main: 'black' }}>
        <p data-testid="child">Child!</p>
      </ThemeProvider>
    )

    expect(queryByTestId('child')).not.toBeNull()
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
      theme: { ...outerTheme, ...innerTheme },
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
      theme: { ...outerestTheme, ...outerTheme, ...innerTheme },
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

    expect(childrenSpy).toHaveBeenCalledWith({ theme: themes.one })
    expect(childrenSpy).toHaveBeenLastCalledWith({ theme: themes.two })
    expect(childrenSpy).toHaveBeenCalledTimes(2)
  })

  it('ThemeProvider propagates theme updates through nested ThemeProviders', () => {
    const augment = outerTheme => ({ ...outerTheme, augmented: true })
    const childrenSpy = jest.fn()

    const Component = ({ theme: themeProp }) => (
      <ThemeProvider theme={themeProp}>
        <ThemeProvider theme={augment}>
          <ThemeConsumer>{childrenSpy}</ThemeConsumer>
        </ThemeProvider>
      </ThemeProvider>
    )

    const { rerender } = render(<Component theme={{ themed: true }} />)

    rerender(<Component theme={{ themed: true, updated: true }} />)

    expect(childrenSpy).toHaveBeenCalledWith({
      theme: { themed: true, augmented: true },
    })
    expect(childrenSpy).toHaveBeenLastCalledWith({
      theme: { themed: true, augmented: true, updated: true },
    })
    expect(childrenSpy).toHaveBeenCalledTimes(2)
  })
})
