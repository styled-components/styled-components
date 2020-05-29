const path = require('path');

module.exports = {
  clearMocks: true,
  collectCoverage: true,
  rootDir: path.join(__dirname, '../..'),
  testURL: 'http://localhost',
};
