/* eslint-disable flowtype/require-valid-file-annotation */
const Benchmark = require('benchmark')
require('console.table'); // eslint-disable-line
const nativeTests = require('./compiled/native').default; // eslint-disable-line
const browserTests = require('./compiled/browser').default; // eslint-disable-line

let relativeTime = null

const runSuite = (suiteName, tests) => {
  const suite = new Benchmark.Suite()

  const testNames = Object.keys(tests)

  testNames.forEach(testName => {
    suite.add(testName, tests[testName])
  })

  suite.on('complete', () => {
    const suiteResults = Array.from(suite)

    const rows = testNames.map(testName => {
      const run = suiteResults.find(run => run.name === testName); // eslint-disable-line
      let result
      if (!run) {
        result = '-'
      } else if (relativeTime !== null) {
        const t = 1 / relativeTime
        result = `${(run.stats.mean * t).toFixed(3)}±${(run.stats.deviation * t).toFixed(3)}`
      } else {
        const t = 1000
        result = `${(run.stats.mean * t).toFixed(3)}±${(run.stats.deviation * t).toFixed(3)}ms`
      }
      return [testName, result]
    })

    console.table([`${suiteName} results`, 'Time'], rows); // eslint-disable-line
  })

  suite.run()
}

const runTests = () => {
  runSuite('native', nativeTests)
  runSuite('browser', browserTests)
}

const baselineSuite = new Benchmark('Baseline', () => {
  const fibonacci = (x) => (x <= 1 ? 1 : (fibonacci(x - 1) + fibonacci(x - 2)))
  fibonacci(20)
})

baselineSuite.on('complete', () => {
  relativeTime = baselineSuite.stats.mean
  runTests()
})

baselineSuite.run()
