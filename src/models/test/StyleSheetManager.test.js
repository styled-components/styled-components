// @flow
/* eslint-disable react/no-multi-comp */
import React from 'react'
import { renderToString } from 'react-dom/server'
import { shallow, mount } from 'enzyme'
import styled, { ServerStyleSheet, StyleSheetManager } from '../../index'

describe('StyleSheetManager', () => {

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
        { child }
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
})
