// @flow

/**
 * Adjusts the css selector for the component's css to increase specificity when needed
 */
export default function getComponentCssSelector(componentName: string, options?: Object) {
  if (options && options.namespaceClasses) {
    let namespaceClass = options.namespaceClasses
    if (Array.isArray(options.namespaceClasses)) {
      namespaceClass = options.namespaceClasses.join(' .')
    }

    return `.${namespaceClass} .${componentName}`
  }

  return `.${componentName}`
}
