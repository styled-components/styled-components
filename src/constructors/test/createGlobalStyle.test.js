// @flow
import React from 'react';
import ReactDOM from 'react-dom';

import { expectCSSMatches, resetStyled } from '../../test/utils'
import stringifyRules from '../../utils/stringifyRules'
import css from '../css'
import _createGlobalStyle from '../createGlobalStyle';
import ThemeProvider from '../../models/ThemeProvider'
import StyleSheetManager from '../../models/StyleSheetManager'

const createGlobalStyle = _createGlobalStyle(stringifyRules, css)
const styled = resetStyled();

describe(`createGlobalStyle`, () => {
  it(`should return a function`, () => {
    const Component = createGlobalStyle``
    expect(typeof Component).toBe('function')
  });

  it(`should inject global <style> when rendered`, () => {
    const {cleanup, render} = setup()
    const Component = createGlobalStyle`div{color:red;} `
    render(<Component/>)
    expectCSSMatches(`div{color:red;} `)
    cleanup()
  });

  /* it(`should support theming`, () => {
    const {cleanup, render} = setup()
    const Component = createGlobalStyle`div {color:${props => props.theme.color};} `
    render(
      <ThemeProvider theme={{ color: 'black' }}>
        <Component/>
      </ThemeProvider>
    );
    expectCSSMatches(`div{color:black;} `)
    cleanup()
  }); */

  it(`should render to StyleSheetManager.target`, () => {
    const {container, cleanup, render} = setup()
    const Component = createGlobalStyle`div {color:red;} `
    render(
      <StyleSheetManager target={container}>
        <Component/>
      </StyleSheetManager>
    )

    const style = container.firstChild;
    expect(style.tagName).toBe('STYLE')
    expect(style.textContent).toContain(`div{color:red;}`)
  });
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
