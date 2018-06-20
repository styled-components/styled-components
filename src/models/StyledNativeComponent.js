// @flow
import hoist from 'hoist-non-react-statics'
import PropTypes from 'prop-types'
import { Component, createElement } from 'react'
import determineTheme from '../utils/determineTheme'
import generateDisplayName from '../utils/generateDisplayName'
import isStyledComponent from '../utils/isStyledComponent'
import isTag from '../utils/isTag'
import hasInInheritanceChain from '../utils/hasInInheritanceChain'
import { CHANNEL, CHANNEL_NEXT, CONTEXT_CHANNEL_SHAPE } from './ThemeProvider'

import type { Theme } from './ThemeProvider'
import type { RuleSet, Target } from '../types'

type State = {
  theme?: ?Theme,
  generatedStyles: any,
}

export default (constructWithOptions: Function, InlineStyle: Function) => {
  // $FlowFixMe
  class BaseStyledNativeComponent extends Component<*, State> {
    static target: Target
    static styledComponentId: string
    static attrs: Object
    static defaultProps: Object
    static inlineStyle: Object
    root: ?Object

    attrs = {}
    state = {
      theme: null,
      generatedStyles: undefined,
    }

    unsubscribeId: number = -1

    unsubscribeFromContext() {
      if (this.unsubscribeId !== -1) {
        this.context[CHANNEL_NEXT].unsubscribe(this.unsubscribeId)
      }
    }

    buildExecutionContext(theme: any, props: any) {
      const { attrs } = this.constructor
      const context = { ...props, theme }
      if (attrs === undefined) {
        return context
      }

      this.attrs = Object.keys(attrs).reduce((acc, key) => {
        const attr = attrs[key]
        // eslint-disable-next-line no-param-reassign
        acc[key] =
          typeof attr === 'function' && !hasInInheritanceChain(attr, Component)
            ? attr(context)
            : attr
        return acc
      }, {})

      return { ...context, ...this.attrs }
    }

    generateAndInjectStyles(theme: any, props: any) {
      const { inlineStyle } = this.constructor
      const executionContext = this.buildExecutionContext(theme, props)

      return inlineStyle.generateStyleObject(executionContext)
    }

    componentWillMount() {
      // If there is a theme in the context, subscribe to the event emitter. This
      // is necessary due to pure components blocking context updates, this circumvents
      // that by updating when an event is emitted
      const styledContext = this.context[CHANNEL_NEXT]
      if (styledContext !== undefined) {
        const { subscribe } = styledContext
        this.unsubscribeId = subscribe(nextTheme => {
          // This will be called once immediately
          const theme = determineTheme(
            this.props,
            nextTheme,
            this.constructor.defaultProps
          )
          const generatedStyles = this.generateAndInjectStyles(
            theme,
            this.props
          )

          this.setState({ theme, generatedStyles })
        })
      } else {
        // eslint-disable-next-line react/prop-types
        const theme = this.props.theme || {}
        const generatedStyles = this.generateAndInjectStyles(theme, this.props)
        this.setState({ theme, generatedStyles })
      }
    }

    componentWillReceiveProps(nextProps: {
      theme?: Theme,
      [key: string]: any,
    }) {
      this.setState(prevState => {
        const theme = determineTheme(
          nextProps,
          prevState.theme,
          this.constructor.defaultProps
        )
        const generatedStyles = this.generateAndInjectStyles(theme, nextProps)

        return { theme, generatedStyles }
      })
    }

    componentWillUnmount() {
      this.unsubscribeFromContext()
    }

    setNativeProps(nativeProps: Object) {
      if (this.root !== undefined) {
        // $FlowFixMe
        this.root.setNativeProps(nativeProps)
      } else if (process.env.NODE_ENV !== 'production') {
        const { displayName } = this.constructor

        // eslint-disable-next-line no-console
        console.warn(
          'setNativeProps was called on a Styled Component wrapping a stateless functional component. ' +
            'In this case no ref will be stored, and instead an innerRef prop will be passed on.\n' +
            `Check whether the stateless functional component is passing on innerRef as a ref in ${displayName ||
              'UnknownStyledNativeComponent'}.`
        )
      }
    }

    onRef = (node: any) => {
      // eslint-disable-next-line react/prop-types
      const { innerRef } = this.props
      this.root = node

      if (typeof innerRef === 'function') {
        innerRef(node)
      } else if (
        typeof innerRef === 'object' &&
        innerRef &&
        innerRef.hasOwnProperty('current')
      ) {
        innerRef.current = node
      }
    }

    render() {
      // eslint-disable-next-line react/prop-types
      const { children, style } = this.props
      const { generatedStyles } = this.state
      const { target } = this.constructor

      const propsForElement = {
        ...this.attrs,
        ...this.props,
        style: [generatedStyles, style],
      }

      if (
        !isStyledComponent(target) &&
        // NOTE: We can't pass a ref to a stateless functional component
        (typeof target !== 'function' ||
          // $FlowFixMe TODO: flow for prototype
          (target.prototype && 'isReactComponent' in target.prototype))
      ) {
        propsForElement.ref = this.onRef
        delete propsForElement.innerRef
      } else {
        propsForElement.innerRef = this.onRef
      }

      return createElement(target, propsForElement, children)
    }
  }

  const createStyledNativeComponent = (
    target: Target,
    options: Object,
    rules: RuleSet
  ) => {
    const {
      isClass = !isTag(target),
      displayName = generateDisplayName(target),
      ParentComponent = BaseStyledNativeComponent,
      rules: extendingRules,
      attrs,
    } = options

    const inlineStyle = new InlineStyle(
      extendingRules === undefined ? rules : extendingRules.concat(rules)
    )

    class StyledNativeComponent extends ParentComponent {
      static attrs = attrs
      static displayName = displayName
      static inlineStyle = inlineStyle
      static styledComponentId = 'StyledNativeComponent'
      static target = target

      static contextTypes = {
        [CHANNEL]: PropTypes.func,
        [CHANNEL_NEXT]: CONTEXT_CHANNEL_SHAPE,
      }

      static withComponent(tag: Target) {
        const { displayName: _, componentId: __, ...optionsToCopy } = options
        const newOptions = {
          ...optionsToCopy,
          ParentComponent: StyledNativeComponent,
        }
        return createStyledNativeComponent(tag, newOptions, rules)
      }

      static get extend() {
        const {
          displayName: _,
          componentId: __,
          rules: rulesFromOptions,
          ...optionsToCopy
        } = options

        const newRules =
          rulesFromOptions === undefined
            ? rules
            : rulesFromOptions.concat(rules)

        const newOptions = {
          ...optionsToCopy,
          rules: newRules,
          ParentComponent: StyledNativeComponent,
        }

        return constructWithOptions(
          createStyledNativeComponent,
          target,
          newOptions
        )
      }
    }

    if (isClass) {
      hoist(StyledNativeComponent, target, {
        // all SC-specific things should not be hoisted
        attrs: true,
        displayName: true,
        extend: true,
        inlineStyle: true,
        styledComponentId: true,
        target: true,
        withComponent: true,
      })
    }

    return StyledNativeComponent
  }

  return createStyledNativeComponent
}
