// @flow

function assertElement(element) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('Must pass a DOM element to find/findAll(element, styledComponent)"');
  }
}

function assertStyledComponent(styledComponent) {
  if (
    !(styledComponent.styledComponentId && typeof styledComponent.styledComponentId === 'string')
  ) {
    throw new Error(
      `${styledComponent.displayName ||
        styledComponent.name ||
        'Component'} is not a styled component.`
    );
  }
}

function enzymeFind(wrapper /* : Object */, styledComponent /* : Object */) {
  assertStyledComponent(styledComponent);

  return wrapper.find(`.${styledComponent.styledComponentId}`);
}

function find(element /* : Element */, styledComponent /* : Object */) {
  assertElement(element);
  assertStyledComponent(styledComponent);
  return element.querySelector(`.${styledComponent.styledComponentId}`);
}

function findAll(element /* : Element */, styledComponent /* : Object */) {
  assertElement(element);
  assertStyledComponent(styledComponent);
  return element.querySelectorAll(`.${styledComponent.styledComponentId}`);
}

exports.enzymeFind = enzymeFind;
exports.find = find;
exports.findAll = findAll;
