/* eslint-disable flowtype/require-valid-file-annotation, no-console */
import { dirname, extname, basename, resolve } from 'path'

const emptyFile = '/* ignored by ./scripts/rollup-plugin-ignore.js */'
const emptyFileName = '\0empty_module'
const cwd = process.cwd()

function ignore(fileList) {
  const fileIds = fileList.map(file => {
    const name = basename(file, extname(file))
    return resolve(cwd, dirname(file), name)
  })

  return {
    resolveId(importee, importer) {
      // ignore IDs with null character, these belong to other plugins
      if (/\0/.test(importee)) return null

      // disregard entry module
      if (!importer) return null

      // ignore modules that are not relatively imported
      if (importee[0] !== '.') return null

      const targetFile = resolve(dirname(importer), importee)
      if (fileIds.includes(targetFile)) {
        return emptyFileName
      }

      return null
    },
    load(id) {
      return id === emptyFileName ? emptyFile : null
    },
  }
}

export default ignore
