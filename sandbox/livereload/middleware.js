/* eslint-disable flowtype/require-valid-file-annotation */
const socket = require('socket.io')
const stripAnsi = require('strip-ansi')

const { EVENTS } = require('../util')

module.exports = (compiler, server) => {
  const io = socket(server)

  const stats = {
    hasErrors: false,
    hasWarnings: false,
    json: null,
  }

  io.on(EVENTS.Connect, connectedSocket => {
    if (stats.hasWarnings) {
      connectedSocket.emit(EVENTS.Warning, stats.json.warnings.map(stripAnsi))
    }

    if (stats.hasErrors) {
      connectedSocket.emit(EVENTS.Error, stats.json.errors.map(stripAnsi))
    }
  })

  compiler.plugin(EVENTS.Done, webpackStats => {
    io.emit(EVENTS.Done)

    stats.hasErrors = webpackStats.hasErrors()
    stats.hasWarnings = webpackStats.hasWarnings()
    stats.json = webpackStats.toJson()
  })

  compiler.plugin(EVENTS.Invalid, () => {
    io.emit('invalid')
  })

  return (req, res, next) => {
    // Maybe some day we will need to hook something here
    next()
  }
}
