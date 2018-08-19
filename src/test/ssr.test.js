/**
 * @jest-environment node
 */
import React from 'react'
import { renderToString, renderToNodeStream } from 'react-dom/server'
import ServerStyleSheet from '../models/ServerStyleSheet'
import { resetStyled } from './utils'
import _createGlobalStyle from '../constructors/createGlobalStyle'
import _keyframes from '../constructors/keyframes'
import stringifyRules from '../utils/stringifyRules'
import css from '../constructors/css'

jest.mock('../utils/nonce')

const createGlobalStyle = _createGlobalStyle(stringifyRules, css)

let index = 0
const keyframes = _keyframes(() => `keyframe_${index++}`, stringifyRules, css)

let styled

describe('ssr', () => {
  beforeEach(() => {
    // eslint-disable-next-line
    require('../utils/nonce').mockReset()

    styled = resetStyled(true)
  })

  afterEach(() => {
    process.env.NODE_ENV = 'test'
  })

  it('should extract the CSS in a simple case', () => {
    const Heading = styled.h1`
      color: red;
    `

    const sheet = new ServerStyleSheet()
    const html = renderToString(
      sheet.collectStyles(<Heading>Hello SSR!</Heading>)
    )
    const css = sheet.getStyleTags()

    expect(html).toMatchSnapshot()
    expect(css).toMatchSnapshot()
  })

  it('should extract both global and local CSS', () => {
    const Component = createGlobalStyle`
      body { background: papayawhip; }
    `
    const Heading = styled.h1`
      color: red;
    `

    const sheet = new ServerStyleSheet()
    const html = renderToString(
      sheet.collectStyles(<React.Fragment>
        <Component />
        <Heading>Hello SSR!</Heading>
      </React.Fragment>)
    )
    const css = sheet.getStyleTags()

    expect(html).toMatchSnapshot()
    expect(css).toMatchSnapshot()
  })

  it('should not spill ServerStyleSheets into each other', () => {
    const A = styled.h1`color: red;`
    const B = styled.h1`color: green;`

    const sheetA = new ServerStyleSheet()
    renderToString(sheetA.collectStyles(<A />))
    const cssA = sheetA.getStyleTags()

    const sheetB = new ServerStyleSheet()
    renderToString(sheetB.collectStyles(<B />))
    const cssB = sheetB.getStyleTags()

    expect(cssA).toContain('red')
    expect(cssA).not.toContain('green')
    expect(cssB).not.toContain('red')
    expect(cssB).toContain('green')
  })

  it.skip('should add a nonce to the stylesheet if webpack nonce is detected in the global scope', () => {
    // eslint-disable-next-line
    require('../utils/nonce').mockImplementation(() => 'foo')

    const Component = createGlobalStyle`
      body { background: papayawhip; }
    `
    const Heading = styled.h1`
      color: red;
    `

    const sheet = new ServerStyleSheet()
    const html = renderToString(
      sheet.collectStyles(<React.Fragment>
        <Component />
        <Heading>Hello SSR!</Heading>
      </React.Fragment>)
    )
    const css = sheet.getStyleTags()

    expect(html).toMatchSnapshot()
    expect(css).toMatchSnapshot()
  })

  it('should render CSS in the order the components were defined, not rendered', () => {
    const ONE = styled.h1.withConfig({ componentId: 'ONE' })`
      color: red;
    `
    const TWO = styled.h2.withConfig({ componentId: 'TWO' })`
      color: blue;
    `

    const sheet = new ServerStyleSheet()
    const html = renderToString(
      sheet.collectStyles(
        <div>
          <TWO />
          <ONE />
        </div>
      )
    )
    const css = sheet.getStyleTags()

    expect(html).toMatchSnapshot()
    expect(css).toMatchSnapshot()
  })

  it('should share global styles but keep renders separate', () => {
    const Component = createGlobalStyle`
      body { background: papayawhip; }
    `
    const PageOne = styled.h1.withConfig({ componentId: 'PageOne' })`
      color: red;
    `
    const PageTwo = styled.h2.withConfig({ componentId: 'PageTwo' })`
      color: blue;
    `

    const sheetOne = new ServerStyleSheet()
    const htmlOne = renderToString(
      sheetOne.collectStyles(<React.Fragment>
        <Component />
        <PageOne>Camera One!</PageOne>
      </React.Fragment>)
    )
    const cssOne = sheetOne.getStyleTags()

    const sheetTwo = new ServerStyleSheet()
    const htmlTwo = renderToString(
      sheetTwo.collectStyles(<React.Fragment>
        <Component />
        <PageTwo>Camera Two!</PageTwo>
      </React.Fragment>)
    )
    const cssTwo = sheetTwo.getStyleTags()

    expect(htmlOne).toMatchSnapshot()
    expect(cssOne).toMatchSnapshot()
    expect(htmlTwo).toMatchSnapshot()
    expect(cssTwo).toMatchSnapshot()
  })

  it.skip('should allow global styles to be injected during rendering', () => {
    const Component1 = createGlobalStyle`html::before { content: 'Before both renders'; }`
    const PageOne = styled.h1.withConfig({ componentId: 'PageOne' })`
      color: red;
    `
    const PageTwo = styled.h2.withConfig({ componentId: 'PageTwo' })`
      color: blue;
    `

    const sheetOne = new ServerStyleSheet()
    const htmlOne = renderToString(
      sheetOne.collectStyles(<React.Fragment>
        <Component1 />
        <PageOne>Camera One!</PageOne>
      </React.Fragment>)
    )
    const Component2 = createGlobalStyle`html::before { content: 'During first render'; }`
    const cssOne = sheetOne.getStyleTags()

    const Component3 = createGlobalStyle`html::before { content: 'Between renders'; }`

    const sheetTwo = new ServerStyleSheet()
    const Component4 = createGlobalStyle`html::before { content: 'During second render'; }`
    const htmlTwo = renderToString(
      sheetTwo.collectStyles(<React.Fragment>
        <Component2 />
        <Component3 />
        <Component4 />
        <PageTwo>Camera Two!</PageTwo>
      </React.Fragment>)
    )
    const cssTwo = sheetTwo.getStyleTags()

    const Component5 = createGlobalStyle`html::before { content: 'After both renders'; }`

    expect(htmlOne).toMatchSnapshot()
    expect(cssOne).toMatchSnapshot()
    expect(htmlTwo).toMatchSnapshot()
    expect(cssTwo).toMatchSnapshot()
  })

  it.skip('should dispatch global styles to each ServerStyleSheet', () => {
    const Component = createGlobalStyle`
      body { background: papayawhip; }
    `
    const Header = styled.h1.withConfig({ componentId: 'Header' })`
      animation: ${props => props.animation} 1s both;
    `

    const sheet = new ServerStyleSheet()
    const html = renderToString(
      sheet.collectStyles(<React.Fragment>
        <Component />
        <Header animation={keyframes`0% { opacity: 0; }`} />
      </React.Fragment>)
    )
    const css = sheet.getStyleTags()

    expect(html).toMatchSnapshot()
    expect(css).toMatchSnapshot()
  })

  it('should return a generated React style element', () => {
    const Component = createGlobalStyle`
      body { background: papayawhip; }
    `
    const Heading = styled.h1`
      color: red;
    `

    const sheet = new ServerStyleSheet()
    const html = renderToString(
      sheet.collectStyles(<React.Fragment>
        <Component />
        <Heading>Hello SSR!</Heading>
      </React.Fragment>)
    )
    const elements = sheet.getStyleElement()

    expect(elements).toHaveLength(1)

    /* I know this looks pointless, but apparently I have the feeling we'll need this */
    expect(elements[0].props.dangerouslySetInnerHTML).toBeDefined()
    expect(elements[0].props.children).not.toBeDefined()

    expect(elements[0].props).toMatchSnapshot()
  })

  it.skip('should return a generated React style element with nonce if webpack nonce is preset in the global scope', () => {
    // eslint-disable-next-line
    require('../utils/nonce').mockImplementation(() => 'foo')

    const Component = createGlobalStyle`
      body { background: papayawhip; }
    `
    const Heading = styled.h1`
      color: red;
    `

    const sheet = new ServerStyleSheet()
    const html = renderToString(
      sheet.collectStyles(<Heading>Hello SSR!</Heading>)
    )
    const elements = sheet.getStyleElement()

    expect(elements).toHaveLength(1)
    expect(elements[0].props.nonce).toBe('foo')
  })

  it('should interleave styles with rendered HTML when utilitizing streaming', () => {
    const Component = createGlobalStyle`
      body { background: papayawhip; }
    `
    const Heading = styled.h1`
      color: red;
    `

    const sheet = new ServerStyleSheet()
    const jsx = sheet.collectStyles(<React.Fragment>
      <Component />
      <Heading>Hello SSR!</Heading>
    </React.Fragment>)
    const stream = sheet.interleaveWithNodeStream(renderToNodeStream(jsx))

    return new Promise((resolve, reject) => {
      let received = ''

      stream.on('data', chunk => {
        received += chunk
      })

      stream.on('end', () => {
        expect(received).toMatchSnapshot()
        expect(sheet.closed).toBe(true)
        resolve()
      })

      stream.on('error', reject)
    })
  })

  it('should handle errors while streaming', () => {
    const Component = createGlobalStyle`
      body { background: papayawhip; }
    `
    const Heading = styled.h1`
      color: red;
    `

    const sheet = new ServerStyleSheet()
    const jsx = sheet.collectStyles(null)
    const stream = sheet.interleaveWithNodeStream(renderToNodeStream(jsx))

    return new Promise((resolve, reject) => {
      stream.on('data', function noop() { })

      stream.on('error', (err) => {
        expect(err).toMatchSnapshot()
        expect(sheet.closed).toBe(true)
        resolve()
      })
    })
  })
})
