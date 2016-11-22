import path from 'path'
import fs from 'fs'
import { transformFileSync } from 'babel-core'
import plugin from '../src'

function trim(str) {
  return str.replace(/^\s+|\s+$/, '');
}

describe('babel-plugin-styled-components', () => {
  const fixturesDir = path.join(__dirname, 'fixtures')
  fs.readdirSync(fixturesDir).map((caseName) => {
    it(`should ${caseName.split('-').join(' ')}`, () => {
      const fixtureDir = path.join(fixturesDir, caseName)
      const actualPath = path.join(fixtureDir, 'actual.js');
      const actual = transformFileSync(actualPath).code

      const expected = fs.readFileSync(
          path.join(fixtureDir, 'expected.js')
      ).toString()

      expect(trim(actual)).toEqual(trim(expected))
    })
  })
})
