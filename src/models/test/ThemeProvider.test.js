// @flow
/* eslint-disable react/no-multi-comp */
import React from 'react'
import { shallow, render, mount } from 'enzyme'
import ThemeProvider, { CHANNEL_NEXT, CONTEXT_CHANNEL_SHAPE  } from '../ThemeProvider'

describe('ThemeProvider', () => {
  it('should not throw an error when no children are passed', () => {
    const result = shallow(<ThemeProvider theme={{}} />)
    expect(result.html()).toEqual(null)
  })

  it('should accept a theme prop that\'s a plain object', () => {
    shallow(<ThemeProvider theme={{ main: 'black' }} />)
  })

  it('should render its child', () => {
    const child = (<p>Child!</p>)
    const renderedComp = shallow(
      <ThemeProvider theme={{ main: 'black' }}>
        { child }
      </ThemeProvider>
    )
    expect(renderedComp.contains(child)).toEqual(true)
  })

  it('should merge its theme with an outer theme', (done) => {
    const outerTheme = { main: 'black' }
    const innerTheme = { secondary: 'black' }
    // Setup Child
    class Child extends React.Component {
      componentWillMount() {
        this.context[CHANNEL_NEXT].subscribe(theme => {
          expect(theme).toEqual({ ...outerTheme, ...innerTheme })
          done()
        })
      }
      render() { return null }
    }
    Child.contextTypes = {
      [CHANNEL_NEXT]: CONTEXT_CHANNEL_SHAPE,
    }

    render(
      <ThemeProvider theme={outerTheme}>
        <ThemeProvider theme={innerTheme}>
          <Child />
        </ThemeProvider>
      </ThemeProvider>
    )
  })

  it('should merge its theme with multiple outer themes', (done) => {
    const outerestTheme = { main: 'black' }
    const outerTheme = { main: 'blue' }
    const innerTheme = { secondary: 'black' }
    // Setup Child
    class Child extends React.Component {
      componentWillMount() {
        this.context[CHANNEL_NEXT].subscribe(theme => {
          expect(theme).toEqual({ ...outerestTheme, ...outerTheme, ...innerTheme })
          done()
        })
      }
      render() { return null }
    }
    Child.contextTypes = {
      [CHANNEL_NEXT]: CONTEXT_CHANNEL_SHAPE,
    }

    render(
      <ThemeProvider theme={outerestTheme}>
        <ThemeProvider theme={outerTheme}>
          <ThemeProvider theme={innerTheme}>
            <Child />
          </ThemeProvider>
        </ThemeProvider>
      </ThemeProvider>
    )
  })

  it('should be able to render two independent themes', (done) => {
    const themes = {
      one: { main: 'black', secondary: 'red' },
      two: { main: 'blue', other: 'green' },
    }
    let childRendered = 0
    // Setup Child
    class Child extends React.Component {
      componentWillMount() {
        this.context[CHANNEL_NEXT].subscribe(theme => {
          // eslint-disable-next-line react/prop-types
          expect(theme).toEqual(themes[this.props.shouldHaveTheme])
          childRendered++ // eslint-disable-line no-plusplus
          if (childRendered === Object.keys(themes).length) {
            done()
          }
        })
      }
      render() { return null }
    }
    Child.contextTypes = {
      [CHANNEL_NEXT]: CONTEXT_CHANNEL_SHAPE,
    }

    render(
      <div>
        <ThemeProvider theme={themes.one}>
          <Child shouldHaveTheme="one" />
        </ThemeProvider>
        <ThemeProvider theme={themes.two}>
          <Child shouldHaveTheme="two" />
        </ThemeProvider>
      </div>
    )
  })

  it('ThemeProvider propagates theme updates through nested ThemeProviders', () => {
    const theme = { themed: true }
    const augment = outerTheme =>
      Object.assign({}, outerTheme, { augmented: true })
    const update = { updated: true }
    let actual
    const expected = { themed: true, augmented: true, updated: true }

    // Setup Child
    class Child extends React.Component {
      componentWillMount() {
        this.context[CHANNEL_NEXT].subscribe(receivedTheme => {
          actual = receivedTheme
        })
      }
      render() {
        return null
      }
    }
    Child.contextTypes = {
      [CHANNEL_NEXT]: CONTEXT_CHANNEL_SHAPE,
    }

    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <ThemeProvider theme={augment}>
          <Child />
        </ThemeProvider>
      </ThemeProvider>,
    )

    wrapper.setProps({ theme: Object.assign({}, theme, update) })

    expect(actual).toEqual(expected)
  })
})
