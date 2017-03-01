/* eslint-disable flowtype/require-valid-file-annotation */
const isCi = require('is-ci')
const Benchmark = require('benchmark')
require('console.table') // eslint-disable-line
const nativeTests = require('./compiled/native').default // eslint-disable-line
const browserTests = require('./compiled/browser').default // eslint-disable-line

/*
In CI, we interweve a baseline benchmark to get consistent results. This means that the results we
get aren't given in units of time, but are relative to each other. We run a lot of these baseline
benchmarks to try and get the most consistent results.
*/

const baselineTest = () => {
  const fibonacci = (x) => (x <= 1 ? 1 : (fibonacci(x - 1) + fibonacci(x - 2)))
  fibonacci(20)
}

const runSuite = (suiteName, tests) => {
  const suite = new Benchmark.Suite()

  const testNames = Object.keys(tests)

  testNames.forEach(testName => {
    if (isCi) suite.add('BASELINE', baselineTest)
    suite.add(testName, tests[testName])
  })
  if (isCi) suite.add('BASELINE', baselineTest)

  let actualTestIndices = Object.keys(testNames).map(Number)
  if (isCi) actualTestIndices = actualTestIndices.map(i => (2 * i) + 1)

  suite.on('complete', () => {
    const rows = actualTestIndices.map(testIndex => {
      const timeToCompleteBaseline = isCi
        ? (suite[testIndex - 1].stats.mean + suite[testIndex + 1].stats.mean) / 2
        : null

      const test = suite[testIndex]

      const { stats } = test
      const { mean, deviation } = stats

      const t = timeToCompleteBaseline !== null
        ? 1 / timeToCompleteBaseline
        : 1000

      const unit = timeToCompleteBaseline !== null ? '' : 'ms'

      const result = `${(mean * t).toFixed(3)}±${(deviation * t).toFixed(3)}${unit}`
      return [test.name, result]
    })

    console.table([`${suiteName} results`, 'Time'], rows) // eslint-disable-line
  })

  suite.run()
}

runSuite('Native', nativeTests)
runSuite('Browser', browserTests)
