// @flow

import ReactDOM from 'react-dom';
import getComponentName from './getComponentName';

export default (target: Object) => {
  let elementClassName = '';

  const prevComponentDidMount = target.componentDidMount;

  // eslint-disable-next-line no-param-reassign
  target.componentDidMount = function componentDidMount() {
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
        `It looks like you've wrapped styled() around your React component (${getComponentName(
          this.props.forwardedClass.target
        )}), but the className prop is not being passed down to a child. No styles will be rendered unless className is composed within your React component.`
      );
    }
  };

  const prevRenderInner = target.renderInner;

  // eslint-disable-next-line no-param-reassign
  target.renderInner = function renderInner(...args) {
    const element = prevRenderInner.apply(this, args);

    elementClassName = element.props.className;

    return element;
  };
};
