// @flow
/* eslint-disable react/no-multi-comp */
import React from 'react'
import { renderToString } from 'react-dom/server'
import { shallow, mount } from 'enzyme'
import styled, { ServerStyleSheet, StyleSheetManager } from '../../index'

describe('StyleSheetManager', () => {
  beforeEach(() => {
    // $FlowFixMe
    document.body.innerHTML = ''
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

  it('should append styles to the same target', () => {
    const target = document.body;

    const RedTitle = styled.h1`color: palevioletred;`
    const GreenTitle = styled.h1`color: forestgreen;`

    class Child extends React.Component {
      componentDidMount() {
        let hasStyles = false;
        // $FlowFixMe
        const styles = document.body.querySelectorAll(`style`)
        styles.forEach(({ textContent }) => textContent.includes(this.props.expected) && (hasStyles = true))
        expect(styles.length).toEqual(2)
        expect(hasStyles).toEqual(true)
      }
      render() { return React.Children.only(this.props.children) }
    }

    mount(
      <div>
        <StyleSheetManager target={target}>
          <Child expected={'palevioletred'}>
            <RedTitle />
          </Child>
        </StyleSheetManager>
        <StyleSheetManager target={target}>
          <Child expected={'forestgreen'}>
            <GreenTitle />
          </Child>
        </StyleSheetManager>
      </div>
    )
  })

  it('should append styles for nested StyleSheetManagers', () => {
    const outer = document.createElement('div')
    outer.id = 'outer'
    const inner = document.createElement('div')
    inner.id = 'inner'
    outer.appendChild(inner)
    // $FlowFixMe
    document.body.appendChild(outer)

    const outerTarget = document.querySelector('#outer')
    const innerTarget = document.querySelector('#inner')
    const RedTitle = styled.h1`color: palevioletred;`
    const GreenTitle = styled.h1`color: forestgreen;`

    class Child extends React.Component {
      componentDidMount() {
        // $FlowFixMe
        const styles = document.querySelector(`#${this.props.target.id} > style`).textContent
        expect(styles.includes(this.props.expected)).toEqual(true)
      }
      render() { return React.Children.only(this.props.children) }
    }

    mount(
      <StyleSheetManager target={outerTarget}>
        <div>
          <Child target={outerTarget} expected={'palevioletred'}>
            <RedTitle />
          </Child>
          <StyleSheetManager target={innerTarget}>
            <Child target={innerTarget} expected={'forestgreen'}>
              <GreenTitle />
            </Child>
          </StyleSheetManager>
        </div>
      </StyleSheetManager>
    )
  })
})
