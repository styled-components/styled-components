const path = require('path');

const SANDBOX_PATHS = {
  // common
  cwd: process.cwd(),
  // webpack specific
  outputPath: path.resolve(__dirname, '.build/'),
  publicPath: '/_build/',
  // source
  appSrc: path.resolve(__dirname, 'src'),
  serverApp: path.resolve(__dirname, 'src', 'server.js'),
  clientApp: path.resolve(__dirname, 'src', 'browser.js'),
  styledComponentsSrc: path.resolve(__dirname, '../styled-components', 'src'),
  indexHtml: path.resolve(__dirname, 'public', 'index.html'),
  // build
  serverBuild: path.resolve(__dirname, '.build', 'server.js'),
};

const REPLACE_REGEX = {
  html: /<!-- SSR:HTML -->/,
  css: /<!-- SSR:CSS -->/,
};

const wrapMiddleware = middleware => next => (req, res) =>
  middleware(req, res, () => next(req, res));

const composeMiddleware = (...middleware) => next =>
  middleware.reduce((p, c) => wrapMiddleware(c)(p), next);

module.exports = {
  SANDBOX_PATHS,
  REPLACE_REGEX,
  composeMiddleware,
};
