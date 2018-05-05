// @flow

function assertElement(element) {
  if (!(element instanceof HTMLElement)) {
    throw new Error(
      'Must pass a DOM element to find/findAll(element, styledComponent)"'
    )
  }
}

function assertStyledComponent(styledComponent) {
  if (
    !(
      typeof styledComponent === 'function' &&
      typeof styledComponent.styledComponentId === 'string'
    )
  ) {
    throw new Error(
      'Must pass a styled component to find/findAll(element, styledComponent)"'
    )
  }
}

function find(element /* : Element */, styledComponent /* : Object */) {
  assertElement(element)
  assertStyledComponent(styledComponent)
  return element.querySelector(`.${styledComponent.styledComponentId}`)
}

function findAll(element /* : Element */, styledComponent /* : Object */) {
  assertElement(element)
  assertStyledComponent(styledComponent)
  return element.querySelectorAll(`.${styledComponent.styledComponentId}`)
}

exports.find = find
exports.findAll = findAll
