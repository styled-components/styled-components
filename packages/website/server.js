const dev = process.env.NODE_ENV !== 'production'
const moduleAlias = require('module-alias')
const path = require('path')

if (!dev) {
  moduleAlias.addAlias('react', 'preact-compat')
  moduleAlias.addAlias('react-dom', 'preact-compat')
}

const { parse } = require('url')
const express = require('express')
const LRUCache = require('lru-cache')
const next = require('next')

const app = next({ dir: '.', dev })
const handle = app.getRequestHandler()

const ssrCache = new LRUCache({
  max: 100,
  maxAge: 1000 * 60 * 60 * 24 // 24h
})

const cachedRender = (req, res, pagePath, queryParams) => {
  const key = `${req.url}`

  if (!dev && ssrCache.has(key)) {
    res.append('X-Cache', 'HIT')
    res.send(ssrCache.get(key))
    return
  }

  app.renderToHTML(req, res, pagePath, queryParams)
    .then(html => {
      ssrCache.set(key, html)

      res.append('X-Cache', 'MISS')
      res.send(html)
    })
    .catch((err) => {
      app.renderError(err, req, res, pagePath, queryParams)
    })
}

const PORT = process.env.PORT || 3000

app.prepare()
  .then(() => {
    const server = express()

    server.disable('x-powered-by')

    server.get('/docs', (req, res) => {
      cachedRender(req, res, '/docs')
    })

    server.get('/docs/basics', (req, res) => {
      cachedRender(req, res, '/docs/basics')
    })

    server.get('/docs/advanced', (req, res) => {
      cachedRender(req, res, '/docs/advanced')
    })

    server.get('/docs/api', (req, res) => {
      cachedRender(req, res, '/docs/api')
    })

    server.get('/sw.js', (req, res) => {
      res.sendFile(path.resolve('./.next/sw.js'))
    });

    server.get('*', (req, res) => {
      const parsedUrl = parse(req.url, true)
      handle(req, res, parsedUrl)
    })

    server.listen(PORT, err => {
      if (err) {
        throw err
      }

      console.log(`> Ready on http://localhost:${PORT}`)
    })
  })
