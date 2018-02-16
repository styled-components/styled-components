// @flow
import React from 'react';
import ReactDOM from 'react-dom';

import { expectCSSMatches, getCSS, resetStyled } from '../../test/utils'
import stringifyRules from '../../utils/stringifyRules'
import css from '../css'
import _createGlobalStyle from '../createGlobalStyle';
import ThemeProvider from '../../models/ThemeProvider'
import StyleSheetManager from '../../models/StyleSheetManager'

const createGlobalStyle = _createGlobalStyle(stringifyRules, css)
const styled = resetStyled();

let context;

beforeEach(() => {
  context = setup()
})

afterEach(() => {
  context.cleanup()
})

describe(`createGlobalStyle`, () => {
  it(`returns a function`, () => {
    const Component = createGlobalStyle``
    expect(typeof Component).toBe('function')
  });

  it(`injects global <style> when rendered`, () => {
    const {render} = context
    const Component = createGlobalStyle`[data-test-inject]{color:red;} `
    render(<Component/>)
    expectCSSMatches(`[data-test-inject]{color:red;} `)
  });

  it(`supports interpolation`, () => {
    const {cleanup, render} = setup()
    const Component = createGlobalStyle`div {color:${props => props.color};} `
    render(
      <ThemeProvider theme={{ color: 'orange' }}>
        <Component color="orange"/>
      </ThemeProvider>
    )
    expectCSSMatches(`div{color:orange;} `)
    cleanup()
  })

  it(`supports theming`, () => {
    const {cleanup, render} = setup()
    const Component = createGlobalStyle`div {color:${props => props.theme.color};} `
    render(
      <ThemeProvider theme={{ color: 'black' }}>
        <Component/>
      </ThemeProvider>
    )
    expectCSSMatches(`div{color:black;} `)
    cleanup()
  })

  it(`updates theme correctly`, () => {
    const {cleanup, render} = setup()
    const Component = createGlobalStyle`div {color:${props => props.theme.color};} `
    let update;
    class App extends React.Component {
      state = { color: 'grey' }

      constructor() {
        super()
        update = (payload) => {
          this.setState(payload)
        }
      }

      render() {
        return (
          <ThemeProvider theme={{ color: this.state.color }}>
            <Component/>
          </ThemeProvider>
        );
      }
    }
    render(<App/>)
    expectCSSMatches(`div{color:grey;} `)

    update({ color: 'red' })
    expectCSSMatches(`div{color:red;} `)

    cleanup()
  })

  it(`renders to StyleSheetManager.target`, () => {
    const {container, render} = context
    const Component = createGlobalStyle`[data-test-target]{color:red;} `
    render(
      <StyleSheetManager target={container}>
        <Component/>
      </StyleSheetManager>
    )

    const style = container.firstChild;
    expect(style.tagName).toBe('STYLE')
    expect(style.textContent).toContain(`[data-test-target]{color:red;}`)
  });

  it(`adds new global rules non-destructively`, () => {
    const {container, render} = context
    const Color = createGlobalStyle`[data-test-add]{color:red;} `
    const Background = createGlobalStyle`[data-test-add]{background:yellow;} `

    render(
      <React.Fragment>
        <Color/>
        <Background/>
      </React.Fragment>
    )

    setTimeout(() => {
      expectCSSMatches(`
        [data-test-add]{color:red;}
        [data-test-add]{background:yellow;}
      `)
    })
  })

  it(`stringifies multiple rules correctly`, () => {
    const {cleanup, render} = setup()
    const Component = createGlobalStyle`
      div {
        color: ${props => props.fg};
        background: ${props => props.bg};
      }
    `
    render(
      <Component fg="red" bg="green"/>
    )
    expectCSSMatches(`div{color:red;background:green;} `)
    cleanup()
  })

  it(`removes styling injected styling when unmounted`, () => {
    const {container, render} = context
    const Component = createGlobalStyle`[data-test-remove]{color:grey;} `

    class Comp extends React.Component {
      state = {
        styled: true
      }

      componentDidMount() {
        this.setState({ styled: false })
      }

      render() {
        return this.state.styled ? <Component/> : null
      }
    }

    render(<Comp/>)
    expect(getCSS()).not.toContain(`[data-test-remove]{color:grey;}`)
  })
})

function setup() {
  const container = document.createElement('div')
  document.body.appendChild(container)

  return {
    container,
    render(comp) {
      ReactDOM.render(comp, container)
    },
    cleanup() {
      resetStyled()
      document.body.removeChild(container)
    }
  }
}
