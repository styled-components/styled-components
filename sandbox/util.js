/* eslint-disable flowtype/require-valid-file-annotation */
const EVENTS = {
  Connect: 'connect',
  Disconnect: 'disconnect',
  Error: 'build-error',
  Warning: 'build-warning',
  Done: 'done',
  Invalid: 'invalid',
}

const CONFIG = {
  HOST: process.env.HOST || '0.0.0.0',
  PORT: process.env.PORT || '3000',
}

const PREFIX = '[SANDBOX]'

const logger = (type, ...args) => console[type](...args) // eslint-disable-line no-console

logger.info = (...args) => logger('info', ...args)

logger.warn = (...args) => logger('warn', ...args)

logger.err = (...args) => logger('error', ...args)

module.exports = {
  EVENTS,
  CONFIG,
  PREFIX,
  logger,
}
