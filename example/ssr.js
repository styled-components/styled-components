import Express from 'express'
import React from 'react'
import { renderToString } from  'react-dom/server'
import styled, { ServerStyleSheet } from '../dist/styled-components'
import fs from 'fs'

const HTML = fs.readFileSync(__dirname + '/index.html').toString()

const Heading = styled.h1`
  color: red;
`

const app = new Express()
const port = 8080

app.get('*', (req, res) => {
  const sheet = new ServerStyleSheet()
  const html = renderToString(sheet.collectStyles(<Heading>Hello SSR!</Heading>))
  const css = sheet.getStyleTags()

  res.status(200).send(
    HTML
      .replace(/<!-- SSR:HTML -->/, html)
      .replace(/<!-- SSR:CSS -->/, css)
  )
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
