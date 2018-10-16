const stripAnsi = require('strip-ansi');
const { createError } = require('micro');

const appMiddleware = require('./appMiddleware');
const webpackMiddleware = require('./webpackMiddleware');

module.exports = async (req, res) => {
  try {
    await webpackMiddleware(appMiddleware)(req, res);
  } catch (err) {
    throw createError(500, stripAnsi(err.message), err);
  }
};
