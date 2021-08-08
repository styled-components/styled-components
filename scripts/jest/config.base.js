const path = require('path');

module.exports = {
  clearMocks: true,
  collectCoverage: !!process.env.PULL_REQUEST,
  rootDir: path.join(__dirname, '../..'),
  snapshotSerializers: ['jest-serializer-html'],
  testURL: 'http://localhost',
};
