const fs = require('fs')
const { send } = require('micro')

const { SANDBOX_PATHS, REPLACE_REGEX } = require('../util')

let cachedFile = null

const asyncReadFile = (filePath, encoding) =>
  new Promise((resolve, reject) => {
    if (cachedFile !== null) {
      resolve(cachedFile)
    } else {
      const callback = (err, data) =>
        err ? reject(err) : resolve((cachedFile = data))

      if (encoding) {
        fs.readFile(filePath, encoding, callback)
      } else {
        fs.readFile(filePath, callback)
      }
    }
  })

module.exports = async (req, res) => {
  const template = await asyncReadFile(SANDBOX_PATHS.indexHtml, 'utf-8')

  // TODO
  // eslint-disable-next-line
  const app = require(SANDBOX_PATHS.serverBuild);

  const html = template
    .replace(REPLACE_REGEX.html, 'foo')
    .replace(REPLACE_REGEX.css, 'bar')

  send(res, 200, html)
}
