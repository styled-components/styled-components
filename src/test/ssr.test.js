/**
 * @jest-environment node
 */
import React from 'react'
import { renderToString, renderToNodeStream } from 'react-dom/server'
import ServerStyleSheet from '../models/ServerStyleSheet'
import { resetStyled } from './utils'
import _injectGlobal from '../constructors/injectGlobal'
import _keyframes from '../constructors/keyframes'
import stringifyRules from '../utils/stringifyRules'
import css from '../constructors/css'

jest.mock('../utils/nonce')

const injectGlobal = _injectGlobal(stringifyRules, css)

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
    injectGlobal`
      body { background: papayawhip; }
    `
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

  it('should add a nonce to the stylesheet if webpack nonce is detected in the global scope', () => {
    // eslint-disable-next-line
    require('../utils/nonce').mockImplementation(() => 'foo')

    injectGlobal`
      body { background: papayawhip; }
    `
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
    injectGlobal`
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
      sheetOne.collectStyles(<PageOne>Camera One!</PageOne>)
    )
    const cssOne = sheetOne.getStyleTags()

    const sheetTwo = new ServerStyleSheet()
    const htmlTwo = renderToString(
      sheetTwo.collectStyles(<PageTwo>Camera Two!</PageTwo>)
    )
    const cssTwo = sheetTwo.getStyleTags()

    expect(htmlOne).toMatchSnapshot()
    expect(cssOne).toMatchSnapshot()
    expect(htmlTwo).toMatchSnapshot()
    expect(cssTwo).toMatchSnapshot()
  })

  it('should allow global styles to be injected during rendering', () => {
    injectGlobal`html::before { content: 'Before both renders'; }`
    const PageOne = styled.h1.withConfig({ componentId: 'PageOne' })`
      color: red;
    `
    const PageTwo = styled.h2.withConfig({ componentId: 'PageTwo' })`
      color: blue;
    `

    const sheetOne = new ServerStyleSheet()
    const htmlOne = renderToString(
      sheetOne.collectStyles(<PageOne>Camera One!</PageOne>)
    )
    injectGlobal`html::before { content: 'During first render'; }`
    const cssOne = sheetOne.getStyleTags()

    injectGlobal`html::before { content: 'Between renders'; }`

    const sheetTwo = new ServerStyleSheet()
    injectGlobal`html::before { content: 'During second render'; }`
    const htmlTwo = renderToString(
      sheetTwo.collectStyles(<PageTwo>Camera Two!</PageTwo>)
    )
    const cssTwo = sheetTwo.getStyleTags()

    injectGlobal`html::before { content: 'After both renders'; }`

    expect(htmlOne).toMatchSnapshot()
    expect(cssOne).toMatchSnapshot()
    expect(htmlTwo).toMatchSnapshot()
    expect(cssTwo).toMatchSnapshot()
  })

  it('should dispatch global styles to each ServerStyleSheet', () => {
    injectGlobal`
      body { background: papayawhip; }
    `
    const Header = styled.h1.withConfig({ componentId: 'Header' })`
      animation: ${props => props.animation} 1s both;
    `

    const sheet = new ServerStyleSheet()
    const html = renderToString(
      sheet.collectStyles(<Header animation={keyframes`0% { opacity: 0; }`} />)
    )
    const css = sheet.getStyleTags()

    expect(html).toMatchSnapshot()
    expect(css).toMatchSnapshot()
  })

  it('should return a generated React style element', () => {
    injectGlobal`
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

    /* I know this looks pointless, but apparently I have the feeling we'll need this */
    expect(elements[0].props.dangerouslySetInnerHTML).toBeDefined()
    expect(elements[0].props.children).not.toBeDefined()

    expect(elements[0].props).toMatchSnapshot()
  })

  it('should return a generated React style element with nonce if webpack nonce is preset in the global scope', () => {
    // eslint-disable-next-line
    require('../utils/nonce').mockImplementation(() => 'foo')

    injectGlobal`
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
    injectGlobal`
      body { background: papayawhip; }
    `
    const Heading = styled.h1`
      color: red;
    `

    const sheet = new ServerStyleSheet()
    const jsx = sheet.collectStyles(<Heading>Hello SSR!</Heading>)
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
    injectGlobal`
      body { background: papayawhip; }
    `
    const Heading = styled.h1`
      color: red;
    `

    const sheet = new ServerStyleSheet()
    const jsx = sheet.collectStyles(null)
    const stream = sheet.interleaveWithNodeStream(renderToNodeStream(jsx))

    return new Promise((resolve, reject) => {
      stream.on('data', function noop(){})

      stream.on('error', (err) => {
        expect(err).toMatchSnapshot()
        expect(sheet.closed).toBe(true)
        resolve()
      })
    })
  })
})
