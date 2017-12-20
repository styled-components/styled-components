const appMiddleware = require('./appMiddleware')
const webpackMiddleware = require('./webpackMiddleware')

module.exports = (req, res) => {
  webpackMiddleware(appMiddleware)(req, res)
}
