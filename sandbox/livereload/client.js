/* eslint-disable flowtype/require-valid-file-annotation */
import socket from 'socket.io-client'

import { EVENTS, PREFIX, logger } from '../util'

const io = socket(`${window.location.protocol}//${window.location.host}`)

const messages = {
  [EVENTS.Connect]: () => {
    logger.info(`${PREFIX} Connected to the livereload server`)
  },
  [EVENTS.Disconnect]: () => {
    logger.warn(`${PREFIX} Disconnected!`)
  },
  [EVENTS.Error]: data => {
    logger.err(`${PREFIX} Errors while compiling.`)
    data.forEach(err => {
      logger.err(err)
    })
  },
  [EVENTS.Warning]: data => {
    logger.warn(`${PREFIX} Warnings while compiling.`)
    data.forEach(warn => {
      logger.warn(warn)
    })
  },
  [EVENTS.Done]: () => {
    logger.info(`${PREFIX} Content base changed. Reloading...`)
    window.location.reload()
  },
  [EVENTS.Invalid]: () => {
    logger.info(`${PREFIX} App updated. Recompiling...`)
  },
}

Object.keys(messages).forEach(msgType => io.on(msgType, messages[msgType]))
