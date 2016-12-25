import * as t from 'babel-types'
import { useFileName, useDisplayName, useSSR } from '../utils/options'
import getName from '../utils/getName'
import path from 'path'
import hash from '../utils/hash'
import { isStyled } from '../utils/detectors'

const blockName = (file) => {
  return file.opts.basename !== 'index' ?
    file.opts.basename :
    path.basename(path.dirname(file.opts.filename))
}

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
    [ t.objectExpression(withConfigProps) ]
  )
}

const getDisplayName = (path, file) => {
  const componentName = getName(path)
  if (file) {
    return componentName ? `${blockName(file)}__${componentName}` : blockName(file)
  } else {
    return componentName
  }
}

let id = 0

const getComponentId = (displayName) => {
  // Prefix the identifier with a character if no displayName exists because CSS classes cannot start with a number
  return `${displayName || 's'}-${hash(`${id}${displayName}`)}`
}

export default (path, state, detector) => {
  if (isStyled(path.node, state)) {
    const displayName = getDisplayName(path, useFileName(state) && state.file)
    id++
    addConfig(
      path,
      useDisplayName(state) && displayName,
      useSSR(state) && getComponentId(displayName)
    )
  }
}
