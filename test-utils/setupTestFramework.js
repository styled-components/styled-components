// @flow
const consoleError = console.error

beforeEach(() => {
  // Suppress errors from JSDOM CSS parser
  // See: https://github.com/jsdom/jsdom/issues/2177
  // eslint-disable-next-line flowtype-errors/show-errors
  ;(console: any).error = message => {
    if (!message.includes('Error: Could not parse CSS stylesheet')) {
      consoleError(message)
    }
  }
})

afterEach(() => {
  // eslint-disable-next-line flowtype-errors/show-errors
  ;(console: any).error = consoleError
})
