import { isValidElement } from 'react'

// Convert React elements to pure text
const elementToText = node => {
  if (Array.isArray(node)) {
    return node
      .map(elementToText)
      .join('')
  } else if (isValidElement(node)) {
    return elementToText(node.props.children)
  } else if (!node) {
    return ''
  }

  return node.toString()
}

const titleToDash = title => (
  elementToText(title)
    .toLowerCase()
    .replace(/[^\w\d\s]/, '')
    .split(' ')
    .join('-')
)

export default titleToDash
