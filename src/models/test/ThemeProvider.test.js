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
    const renderFn = jest.fn()

    render(
      <ThemeProvider theme={outerTheme}>
        <ThemeProvider theme={innerTheme}>
          <ThemeConsumer>{renderFn}</ThemeConsumer>
        </ThemeProvider>
      </ThemeProvider>
    )

    expect(renderFn).toHaveBeenCalledTimes(1)
    expect(renderFn).toHaveBeenCalledWith({
      theme: { ...outerTheme, ...innerTheme },
    })
  })

  it('should merge its theme with multiple outer themes', () => {
    const outerestTheme = { main: 'black' }
    const outerTheme = { main: 'blue' }
    const innerTheme = { secondary: 'black' }
    const renderFn = jest.fn()

    render(
      <ThemeProvider theme={outerestTheme}>
        <ThemeProvider theme={outerTheme}>
          <ThemeProvider theme={innerTheme}>
            <ThemeConsumer>{renderFn}</ThemeConsumer>
          </ThemeProvider>
        </ThemeProvider>
      </ThemeProvider>
    )

    expect(renderFn).toHaveBeenCalledTimes(1)
    expect(renderFn).toHaveBeenCalledWith({
      theme: { ...outerestTheme, ...outerTheme, ...innerTheme },
    })
  })

  it('should be able to render two independent themes', () => {
    const themes = {
      one: { main: 'black', secondary: 'red' },
      two: { main: 'blue', other: 'green' },
    }
    const renderFn = jest.fn()

    render(
      <div>
        <ThemeProvider theme={themes.one}>
          <ThemeConsumer>{renderFn}</ThemeConsumer>
        </ThemeProvider>
        <ThemeProvider theme={themes.two}>
          <ThemeConsumer>{renderFn}</ThemeConsumer>
        </ThemeProvider>
      </div>
    )

    expect(renderFn).toHaveBeenCalledWith({ theme: themes.one })
    expect(renderFn).toHaveBeenLastCalledWith({ theme: themes.two })
    expect(renderFn).toHaveBeenCalledTimes(2)
  })

  it('ThemeProvider propagates theme updates through nested ThemeProviders', () => {
    const augment = outerTheme => ({ ...outerTheme, augmented: true })
    const renderFn = jest.fn()

    const Component = ({ theme: themeProp }) => (
      <ThemeProvider theme={themeProp}>
        <ThemeProvider theme={augment}>
          <ThemeConsumer>{renderFn}</ThemeConsumer>
        </ThemeProvider>
      </ThemeProvider>
    )

    const { rerender } = render(<Component theme={{ themed: true }} />)

    rerender(<Component theme={{ themed: true, updated: true }} />)

    expect(renderFn).toHaveBeenCalledWith({
      theme: { themed: true, augmented: true },
    })
    expect(renderFn).toHaveBeenLastCalledWith({
      theme: { themed: true, augmented: true, updated: true },
    })
    expect(renderFn).toHaveBeenCalledTimes(2)
  })
})
