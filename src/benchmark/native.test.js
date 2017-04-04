// @flow
import React from 'react'
import { create as render } from 'react-test-renderer'
import styled from '../native'

const warmup = () => {
  // Warmup
  new Array(10).fill(null).forEach(() => {
    const Root = styled.View`
      color: red;
    `

    render(<Root />)
  })
}

describe('native benchmark', () => {
  warmup()

  it('benchmark simple component with no shorthands', () => {
    const Root = styled.View`
      avoid-caching-other-results: 1;
      color: red;
    `

    render(<Root />)
  })

  it('benchmark simple component with prop-based style with no shorthands', () => {
    const Root = styled.View`
      avoid-caching-other-results: 2;
      color: ${props => props.color};
    `

    const instance = render(<Root color="red" />)
    instance.update(<Root color="blue" />)
  })

  it('benchmark simple component with prop-based style with caching', () => {
    const Root = styled.View`
      avoid-caching-other-results: 3;
      color: ${props => props.color};
    `

    const instance = render(<Root color="red" />)
    instance.update(<Root color="blue" />)
    instance.update(<Root color="red" />)
    instance.update(<Root color="blue" />)
    instance.update(<Root color="red" />)
    instance.update(<Root color="blue" />)
    instance.update(<Root color="red" />)
    instance.update(<Root color="blue" />)
    instance.update(<Root color="red" />)
    instance.update(<Root color="blue" />)
  })

  it('benchmark simple component with prop-based style with a lot of values', () => {
    const Root = styled.View`
      avoid-caching-other-results: 4;
      color: ${props => props.color};
    `

    const instance = render(<Root color="red" />)
    instance.update(<Root color="orange" />)
    instance.update(<Root color="yellow" />)
    instance.update(<Root color="green" />)
    instance.update(<Root color="blue" />)
    instance.update(<Root color="indigo" />)
    instance.update(<Root color="violet" />)
  })

  it('benchmark large component', () => {
    const Root = styled.View`
      avoid-caching-other-results: 5;
      color: red;
      flex: 1;
      font: bold 12/14 "Helvetica";
      margin: 1 2;
      padding: 3 4;
      border: 1 solid black;
    `

    render(<Root />)
  })

  it('benchmark large component with caching', () => {
    const Root = styled.View`
      avoid-caching-other-results: 6;
      color: ${props => props.color};
      flex: 1;
      font: bold 12/14 "Helvetica";
      margin: 1 2;
      padding: 3 4;
      border: 1 solid black;
    `

    const instance = render(<Root color="red" />)
    instance.update(<Root color="blue" />)
    instance.update(<Root color="red" />)
    instance.update(<Root color="blue" />)
    instance.update(<Root color="red" />)
    instance.update(<Root color="blue" />)
    instance.update(<Root color="red" />)
    instance.update(<Root color="blue" />)
    instance.update(<Root color="red" />)
    instance.update(<Root color="blue" />)
  })

  it('benchmark large component with a lot of values', () => {
    const Root = styled.View`
      avoid-caching-other-results: 7;
      color: ${props => props.color};
      flex: 1;
      font: bold 12/14 "Helvetica";
      margin: 1 2;
      padding: 3 4;
      border: 1 solid black;
    `

    const instance = render(<Root color="red" />)
    instance.update(<Root color="orange" />)
    instance.update(<Root color="yellow" />)
    instance.update(<Root color="green" />)
    instance.update(<Root color="blue" />)
    instance.update(<Root color="indigo" />)
    instance.update(<Root color="violet" />)
  })
})
