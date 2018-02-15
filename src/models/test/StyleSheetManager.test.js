// @flow
/* eslint-disable react/no-multi-comp */
import React from 'react'
import { renderToString } from 'react-dom/server'
import { shallow, mount } from 'enzyme'
import StyleSheetManager from '../StyleSheetManager'
import StyleSheet from '../StyleSheet'
import ServerStyleSheet from '../ServerStyleSheet'
import { resetStyled, expectCSSMatches } from '../../test/utils'

let styled

describe('StyleSheetManager', () => {
  beforeEach(() => {
    // $FlowFixMe
    document.body.innerHTML = ''
    // $FlowFixMe
    document.head.innerHTML = ''

    styled = resetStyled(true)
  })

  it('should use given stylesheet instance', () => {
    const sheet = new ServerStyleSheet()
    const Title = styled.h1`color: palevioletred;`
    renderToString(
      <StyleSheetManager sheet={sheet.instance}>
        <Title />
      </StyleSheetManager>
    )
    expect(sheet.getStyleTags().includes(`palevioletred`)).toEqual(true)
  })

  it('should render its child', () => {
    const target = document.head
    const Title = styled.h1`color: palevioletred;`
    const child = <Title />
    const renderedComp = shallow(
      <StyleSheetManager target={target}>
        {child}
      </StyleSheetManager>
    )
    expect(renderedComp.contains(child)).toEqual(true)
  })

  it('should append style to given target', () => {
    const target = document.body
    const Title = styled.h1`color: palevioletred;`
    class Child extends React.Component {
      componentDidMount() {
        // $FlowFixMe
        const styles = target.querySelector('style').textContent
        expect(styles.includes(`palevioletred`)).toEqual(true)
      }
      render() { return <Title /> }
    }
    mount(
      <StyleSheetManager target={target}>
        <Child />
      </StyleSheetManager>
    )
  })

  it('should append style to given target in iframe', () => {
    const iframe = document.createElement('iframe')
    const app = document.createElement('div')
    // $FlowFixMe
    document.body.appendChild(iframe)
    // $FlowFixMe
    iframe.contentDocument.body.appendChild(app)
    const target = iframe.contentDocument.head
    const Title = styled.h1`color: palevioletred;`
    class Child extends React.Component {
      componentDidMount() {
        // $FlowFixMe
        const styles = target.querySelector('style').textContent
        expect(styles.includes(`palevioletred`)).toEqual(true)
      }
      render() { return <Title /> }
    }
    mount(
      <StyleSheetManager target={target}>
        <Child />
      </StyleSheetManager>,
      { attachTo: app }
    )
  })

  it('should apply styles to appropriate targets for nested StyleSheetManagers', () => {
    const ONE = styled.h1`
      color: red;
    `
    const TWO = styled.h2`
      color: blue;
    `
    const THREE = styled.h3`
      color: green;
    `
    mount(
      <div>
        <ONE/>
        <StyleSheetManager target={document.head}>
          <div>
            <TWO />
            <StyleSheetManager target={document.body}>
              <THREE />
            </StyleSheetManager>
          </div>
        </StyleSheetManager>
      </div>
    )

    // $FlowFixMe
    expect(document.head.innerHTML).toMatchSnapshot()
    // $FlowFixMe
    expect(document.body.innerHTML).toMatchSnapshot()
  })

  describe('ssr', () => {
    it('should extract CSS outside the nested StyleSheetManager', () => {
      const sheet = new ServerStyleSheet()
      const ONE = styled.h1`
        color: red;
      `
      const TWO = styled.h2`
        color: blue;
      `
      class Wrapper extends React.Component {
        state = {
          targetRef: null
        }
        render() {
          return (
            <div ref={(el) => { this.setState({ targetRef: el }) }}>
              {this.state.targetRef && <StyleSheetManager target={this.state.targetRef}>
                <TWO />
              </StyleSheetManager>}
            </div>
          )
        }
      }

      const html = renderToString(
        <StyleSheetManager sheet={sheet.instance}>
          <div>
            <ONE />
            <Wrapper />
          </div>
        </StyleSheetManager>
      )
      const css = sheet.getStyleTags()

      expect(html).toMatchSnapshot()
      expect(css).toMatchSnapshot()
    })
  })
})
