import fs from 'fs'
import express from 'express'
import React from 'react'
import { renderToStaticMarkup } from  'react-dom/server'
import StyleSheet from '../src/models/StyleSheet'
import App from './src/components/app'

const HTML = fs.readFileSync(__dirname + '/index.html').toString()

const app = new express()

app.get('/', (req, res) => {
  StyleSheet.reset(true)

  const html = renderToStaticMarkup(<App/>)
  const css = StyleSheet.instance.toHTML()

  res.send(
    HTML
      .replace(/<!-- SSR:HTML -->/, html)
      .replace(/<!-- SSR:CSS -->/, css)
  )
})

export default app
