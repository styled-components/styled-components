const path = require('path');

module.exports = {
  clearMocks: true,
  collectCoverage: !!process.env.PULL_REQUEST,
  rootDir: path.join(__dirname, '../..'),
  testURL: 'http://localhost',
};
