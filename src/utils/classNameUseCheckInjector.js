// @flow

import ReactDOM from 'react-dom';

export default (component: Object) => {
  let elementClassName = '';

  const prevComponentDidMount = component.componentDidMount;

  // eslint-disable-next-line no-param-reassign
  component.componentDidMount = function componentDidMount() {
    if (typeof prevComponentDidMount === 'function') {
      prevComponentDidMount.call(this);
    }

    const classNames = elementClassName.split(' ');
    // eslint-disable-next-line react/no-find-dom-node
    const node = ReactDOM.findDOMNode(this);
    const selector = classNames.map(s => `.${s}`).join('');

    if (
      node &&
      !classNames.every(
        className =>
          node.classList &&
          typeof node.classList.contains === 'function' &&
          node.classList.contains(className)
      ) &&
      typeof node.querySelector === 'function' &&
      !node.querySelector(selector)
    ) {
      console.warn(
        "It looks like you've used styled() factor with React component, but prop `className` is not used"
      );
    }
  };

  const prevRenderInner = component.renderInner;

  // eslint-disable-next-line no-param-reassign
  component.renderInner = function renderInner(...args) {
    const element = prevRenderInner.apply(this, args);

    elementClassName = element.props.className;

    return element;
  };
};
