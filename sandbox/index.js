/* eslint-disable flowtype/require-valid-file-annotation */
const fs = require('fs')

const path = require('path')

const express = require('express')

const webpackDevMiddleware = require('webpack-dev-middleware')

const webpack = require('webpack')

const { CONFIG, logger } = require('./util')

const webpackConfig = require('./webpack.config.dev')

const livereloadMiddleware = require('./livereload/middleware')

const compiler = webpack(webpackConfig)

const devMiddleware = webpackDevMiddleware(compiler, webpackConfig.devServer)

const indexHtml = fs.readFileSync(
  path.resolve(__dirname, './public/index.html'),
  'utf-8' // eslint-disable-line comma-dangle
)

const app = express()

const server = require('http').Server(app)

app.use(devMiddleware)

app.use(livereloadMiddleware(compiler, server))

app.get('*', (req, res) => {
  // We use webpackDevMiddleware in-memory file system to read server script after compilation
  const serverScript = devMiddleware.fileSystem.readFileSync(
    path.join(webpackConfig.output.path, 'server.js'),
    'utf-8' // eslint-disable-line comma-dangle
  )

  // Then we evaluate this script to get prerendered content
  const { html, css } = eval(serverScript) // eslint-disable-line no-eval

  // Replace placeholders in index.html template
  const response = indexHtml
    .replace(/<!-- SSR:HTML -->/, `<div id="react-root">${html}</div>`)
    .replace(/<!-- SSR:CSS -->/, css)

  // Done! Send it to the client
  res.send(response)
})

server.listen(CONFIG.PORT, CONFIG.HOST, err => {
  if (err) {
    logger.err('Failed to start sandbox:')
    logger.err(err)
  } else {
    logger.info(
      `Listening on port ${CONFIG.PORT}. Open up http://${CONFIG.HOST}:${CONFIG.PORT}/ in your browser.` // eslint-disable-line comma-dangle
    )
  }
})
