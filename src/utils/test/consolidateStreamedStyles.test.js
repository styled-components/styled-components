// @flow
import consolidateStreamedStyles from '../consolidateStreamedStyles'

it('should find all inline style blocks and move them into the document head', () => {
  // verify initial state
  document.head.innerHTML = '<title>Testing!</title>'

  expect(document.documentElement.outerHTML).toBe(
    '<html><head><title>Testing!</title></head><body></body></html>'
  )

  // inject some example streaming output
  document.body.innerHTML = `
    <body><style type="text/css" data-styled-components="diWxUz" data-styled-components-is-local="true">/* sc-component-id: sc-bdVaJa */.diWxUz{color:red;}</style><h1 class="sc-bdVaJa diWxUz" data-reactroot="">Hello SSR!</h1></body>
  `

  consolidateStreamedStyles()

  // verify state after regrouping (inline style blocks should be relocated to the end of <head>)
  expect(document.querySelector('body style')).toBeNull()
  expect(document.documentElement.outerHTML).toMatchSnapshot()
})
