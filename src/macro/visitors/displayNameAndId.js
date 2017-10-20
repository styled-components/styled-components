/* eslint-disable */

import * as t from 'babel-types'
import { useFileName, useDisplayName, useSSR } from '../utils/options'
import getName from '../utils/getName'
import path from 'path'
import fs from 'fs'
import hash from '../utils/hash'
import { isStyled } from '../utils/detectors'

const addConfig = (path, displayName, componentId) => {
  if (!displayName && !componentId) {
    return
  }

  const withConfigProps = []
  if (displayName) {
    withConfigProps.push(t.objectProperty(t.identifier('displayName'), t.stringLiteral(displayName)))
  }
  if (componentId) {
    withConfigProps.push(t.objectProperty(t.identifier('componentId'), t.stringLiteral(componentId)))
  }

  // Replace x`...` with x.withConfig({ })`...`
  path.node.tag = t.callExpression(
    t.memberExpression(path.node.tag, t.identifier('withConfig')),
    [t.objectExpression(withConfigProps)],
  )
}

const getBlockName = (file) => {
  const name = path.basename(file.opts.filename, path.extname(file.opts.filename))
  return name !== 'index' ? name : path.basename(path.dirname(file.opts.filename))
}

const getDisplayName = (path, state) => {
  const { file } = state
  const componentName = getName(path)
  if (file) {
    const blockName = getBlockName(file)
    if (blockName === componentName) {
      return componentName
    }
    return componentName ? `${blockName}__${componentName}` : blockName
  } else {
    return componentName
  }
}

const findModuleRoot = (filename) => {
  if (!filename) {
    return null
  }
  const dir = path.dirname(filename)
  if (fs.existsSync(path.join(dir, 'package.json'))) {
    return dir
  } else if (dir !== filename) {
    return findModuleRoot(dir)
  } else {
    return null
  }
}

const FILE_HASH = 'styled-components-file-hash'
const COMPONENT_POSITION = 'styled-components-component-position'
const separatorRegExp = new RegExp(`\\${path.sep}`, 'g')

const getFileHash = (state) => {
  const { file } = state
  // hash calculation is costly due to fs operations, so we'll cache it per file.
  if (file.get(FILE_HASH)) {
    return file.get(FILE_HASH)
  }
  const filename = file.opts.filename
  // find module root directory
  const moduleRoot = findModuleRoot(filename)
  const filePath = moduleRoot && path.relative(moduleRoot, filename).replace(separatorRegExp, '/')
  const moduleName = moduleRoot && JSON.parse(fs.readFileSync(path.join(moduleRoot, 'package.json'))).name
  const code = file.code

  const fileHash = hash([moduleName, filePath, code].join(''))
  file.set(FILE_HASH, fileHash)
  return fileHash
}

const getNextId = (state) => {
  const id = state.file.get(COMPONENT_POSITION) || 0
  state.file.set(COMPONENT_POSITION, id + 1)
  return id
}

const getComponentId = (state) =>
  // Prefix the identifier with a character because CSS classes cannot start with a number
   `${getFileHash(state).replace(/^(\d)/, 's$1')}-${getNextId(state)}`

export default (path, state) => {
  if (isStyled(path.node.tag, state)) {
    const displayName = useDisplayName(state) && getDisplayName(path, useFileName(state) && state)

    addConfig(
      path,
      displayName && displayName.replace(/[^_a-zA-Z0-9-]/g, ''),
      useSSR(state) && getComponentId(state),
    )
  }
}
