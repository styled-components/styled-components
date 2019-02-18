// @flow
import ReactDOM from 'react-dom';
import getComponentName from './getComponentName';

const didWarnAboutClassNameUsage = new Set();

export default (target: Object) => {
  let elementClassName = '';

  const targetCDM = target.componentDidMount;

  // eslint-disable-next-line no-param-reassign
  target.componentDidMount = function componentDidMount() {
    if (typeof targetCDM === 'function') {
      targetCDM.call(this);
    }

    const forwardTarget = this.props.forwardedComponent.target;

    if (
      (target.props && target.props.suppressClassNameWarning) ||
      (target.attrs && target.attrs.suppressClassNameWarning) ||
      didWarnAboutClassNameUsage.has(forwardTarget)
    ) {
      return;
    }

    didWarnAboutClassNameUsage.add(forwardTarget);

    const classNames = elementClassName
      .replace(/ +/g, ' ')
      .trim()
      .split(' ');
    // eslint-disable-next-line react/no-find-dom-node
    const node: Element | null = (ReactDOM.findDOMNode(this): any);
    const selector = classNames.map(s => `.${s}`).join('');

    if (
      node &&
      node.nodeType === 1 &&
      !classNames.every(className => node.classList && node.classList.contains(className)) &&
      !node.querySelector(selector)
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        `It looks like you've wrapped styled() around your React component (${getComponentName(
          forwardTarget
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
