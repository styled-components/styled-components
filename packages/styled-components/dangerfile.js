// @flow

import { danger, warn, fail, message } from 'danger'
import fs from 'fs'

const jsModifiedFiles = danger.git.modified_files.filter(path => path.startsWith('src') && path.endsWith('js'))
const vendorModifiedFiles = danger.git.modified_files.filter(path => path.startsWith('src/vendor') && path.endsWith('js'))

const hasAppChanges = jsModifiedFiles.length > 0
const jsTestChanges = jsModifiedFiles.filter(filepath => filepath.endsWith('test.js'))
const hasTestChanges = jsTestChanges.length > 0

// Congrats, version bump up!
const isVersionBump = danger.git.modified_files.includes('package.json')
const packageDiff = danger.git.diffForFile('package.json')

if (isVersionBump && packageDiff && packageDiff.includes('version')) { message(':tada: Version BUMP UP!') }

// Warn when there is a big PR
const bigPRThreshold = 500
if (danger.github.pr.additions + danger.github.pr.deletions > bigPRThreshold) {
  warn(':exclamation: Big PR')
}

// Fail if there are app changes without a CHANGELOG
if (!danger.git.modified_files.includes('CHANGELOG.md') && hasAppChanges) {
  const changelogLink = 'https://github.com/styled-components/styled-components/blob/master/CHANGELOG.md'
  fail(`Please include a CHANGELOG entry. You can find it at <a href='${changelogLink}'>CHANGELOG.md</a>`)
}

// Warn if there are library changes, but not tests (excluding vendor)
const libraryOnlyFiles = jsModifiedFiles.filter(file => !vendorModifiedFiles.includes(file))
if (libraryOnlyFiles.length > 0 && hasTestChanges) {
  warn("There are library changes, but not tests. That's OK as long as you're refactoring existing code")
}

// Warn if StyledComponent.js was edited but not StyledNativeComponent.js or viceversa
const hasStyledChanges = danger.git.modified_files.find(path => path.endsWith('StyledComponent.js')) !== null
const hasNativeStyledChanges = danger.git.modified_files.find(path => path.endsWith('StyledNativeComponent.js')) !== null
if (hasStyledChanges && !hasNativeStyledChanges) {
  warn("A change was made in StyledComponent.js that wasn't made in StyledNativeComponent.js or viceversa.")
}

// Changes to these files may need SemVer bumps
const semverBumpFiles = ['ThemeProvider.js', 'StyledComponent.js', 'StyledNativeComponent.js']
semverBumpFiles.forEach(file => {
  if (jsModifiedFiles.includes(file)) {
    warn('Changes to #{file} might be SemVer major changes.')
  }
})

// Be careful of leaving testing shortcuts in the codebase
jsTestChanges.forEach(file => {
  const content = fs.readFileSync(file).toString()
  if (content.includes('it.only') || content.includes('describe.only')) { fail(`an \`only\` was left in tests (${file})`) }
})
