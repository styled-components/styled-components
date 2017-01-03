/* eslint-disable flowtype/require-valid-file-annotation, no-console */
const { argv } = require('yargs')
const rollupConfig = require('./rollup.config')

// define browsers with the `--browsers` parameter
const browsers = (argv.browsers || process.env.BROWSERS || 'Chrome').split(',')
// run with `watch` using the `--watch` flag
const watch = argv.watch

module.exports = (config) => {
  config.set({
    frameworks: ['mocha'],
    singleRun: !watch,
    browsers,
    autoWatch: watch,
    customLaunchers: {
      SLChrome: {
        base: 'SauceLabs',
        browserName: 'chrome',
        platform: 'OS X 10.11',
      },
      SLFirefox: {
        base: 'SauceLabs',
        browserName: 'firefox',
        platform: 'OS X 10.11',
      },
      SLEdge: {
        base: 'SauceLabs',
        browserName: 'microsoftedge',
      },
      SLSafari: {
        base: 'SauceLabs',
        browserName: 'safari',
        platform: 'OS X 10.11',
      },
      SLInternetExplorer11: {
        base: 'SauceLabs',
        browserName: 'internet explorer',
        version: '11',
        platform: 'Windows 10',
      },
    },
    preprocessors: {
      './src/**/*.test.js': ['rollup'],
    },
    rollupPreprocessor: Object.assign(rollupConfig, {
      sourceMap: 'inline',
      // Clear these to make sure to import React during tests
      globals: {},
      external: [],
    }),
    files: ['./src/**/*.test.js'],
    sauceLabs: {
      testName: 'styled-components',
      startConnect: false,
      tunnelIdentifier: process.env.TRAVIS_JOB_NUMBER,
    },
    reporters: ['dots', 'saucelabs'],
  })
}
