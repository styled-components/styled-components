// @flow
import 'jest-dom/extend-expect'
import 'react-testing-library/cleanup-after-each'
import React from 'react'
import { render } from 'react-testing-library'
import ThemeProvider from '../../models/ThemeProvider'
import withTheme from '../withTheme'

const Component = withTheme(({ theme } = {}) => (
  <div
    data-testid="component"
    style={{ color: theme ? theme.main : undefined }}
  />
))

describe('withTheme', () => {
  it('should not throw an error', () => {
    console.error = jest.fn()
    expect(() => render(<Component />).not.toThrow())
  })

  it('should log warning if no context is provided', () => {
    console.warn = jest.fn()
    render(<Component />)

    expect(console.warn).toHaveBeenCalledWith(
      '[withTheme] You are not using a ThemeProvider nor passing a theme prop or a theme in defaultProps'
    )
  })

  it('should pass theme prop to component', () => {
    const { getByTestId } = render(
      <ThemeProvider theme={{ main: 'black' }}>
        <Component />
      </ThemeProvider>
    )

    expect(getByTestId('component')).toHaveStyle('color: black')
  })
})
