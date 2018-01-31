// @flow
import appendToHead from '../appendToHead'

it('should append after the last styled component tag', () => {
  const styledComponentTag = '<style type="text/css" data-styled-components="diWxUz" data-styled-components-is-local="true">/* sc-component-id: sc-bdVaJa */.diWxUz{color:red;}</style>';
  const nonStyledComponentTag = '<style type="text/css">.some-class{color:red;}</style>';
  let newStyledComponentTag = document.createElement('style')
  newStyledComponentTag.type = 'text/css'
  newStyledComponentTag.setAttribute('data-styled-components', 'diUxUz')
  newStyledComponentTag.setAttribute('data-styled-components-is-local', 'true')
  newStyledComponentTag.innerText = '/* sc-component-id: sc-bdVaJa */.diUxUz{color:white;}';

  //'<style type="text/css" data-styled-components="diUxUz" data-styled-components-is-local="true">/* sc-component-id: sc-bdVaJa */.diUxUz{color:white;}</style>';
  // verify initial state
  document.head.innerHTML = `<title>Testing!</title>${styledComponentTag}${nonStyledComponentTag}`;

  expect(document.documentElement.outerHTML).toBe(
    `<html><head><title>Testing!</title>${styledComponentTag}${nonStyledComponentTag}</head><body></body></html>`
  )

  appendToHead(newStyledComponentTag);

  expect(document.documentElement.outerHTML).toBe(
    `<html><head><title>Testing!</title>${styledComponentTag}${newStyledComponentTag.outerHTML}${nonStyledComponentTag}</head><body></body></html>`
  )
})

it('should append to the end of the head if no styled component tags present in head', () => {
  const nonStyledComponentTag = '<style type="text/css">.some-class{color:red;}</style>';
  let newStyledComponentTag = document.createElement('style')
  newStyledComponentTag.type = 'text/css'
  newStyledComponentTag.setAttribute('data-styled-components', 'diUxUz')
  newStyledComponentTag.setAttribute('data-styled-components-is-local', 'true')
  newStyledComponentTag.innerText = '/* sc-component-id: sc-bdVaJa */.diUxUz{color:white;}';

  //'<style type="text/css" data-styled-components="diUxUz" data-styled-components-is-local="true">/* sc-component-id: sc-bdVaJa */.diUxUz{color:white;}</style>';
  // verify initial state
  document.head.innerHTML = `<title>Testing!</title>${nonStyledComponentTag}`;

  expect(document.documentElement.outerHTML).toBe(
    `<html><head><title>Testing!</title>${nonStyledComponentTag}</head><body></body></html>`
  )

  appendToHead(newStyledComponentTag);

  expect(document.documentElement.outerHTML).toBe(
    `<html><head><title>Testing!</title>${nonStyledComponentTag}${newStyledComponentTag.outerHTML}</head><body></body></html>`
  )
})
