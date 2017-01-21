import Express from 'express'
import React from 'react'
import {renderToString} from  'react-dom/server'
import styled, {styleSheet} from '../dist/styled-components'

const Heading = styled.h1`
  color: red;
`

const app = new Express()
const port = 8080

app.get('*', (req, res) => {
  const componentHTML = renderToString(<Heading>Hello SSR!</Heading>)
  
  const css = styleSheet.getCSS()

  res.status(200).send(`
    <!doctype html>
    <html>
      <head>
        <style>
          ${css}
        </style>
      </head>
      <body>
        ${componentHTML}
      </body>
  </html>`)
})

app.listen(port, error => {
  /* eslint-disable no-console */
  if (error) {
    console.error(error)
  } else {
    console.info(
      '🌎 Listening on port %s. Open up http://localhost:%s/ in your browser.',
      port,
      port
    )
  }
  /* eslint-enable no-console */
})
