// @flow
const Benchmark = require('benchmark')
require('console.table') // eslint-disable-line
const nativeTests = require('./compiled/native').default // eslint-disable-line
const browserTests = require('./compiled/browser').default // eslint-disable-line

const runSuite = (suiteName, tests) => {
  const suite = new Benchmark.Suite()

  const testNames = Object.keys(tests)

  testNames.forEach((testName) => {
    suite.add(testName, tests[testName])
  })

  suite.on('complete', () => {
    const suiteResults = Array.from(suite)

    const rows = testNames.map(testName => {
      const run = suiteResults.find(run => run.name === testName) // eslint-disable-line
      const result = run
        ? `${(run.stats.mean * 1000).toFixed(3)}±${(run.stats.deviation * 1000).toFixed(3)}ms`
        : '-'
      return [testName, result]
    })

    console.log(`Results for ${suiteName}`) // eslint-disable-line
    console.table(rows) // eslint-disable-line
  })

  suite.run()
}

runSuite('native', nativeTests)
runSuite('browser', browserTests)
