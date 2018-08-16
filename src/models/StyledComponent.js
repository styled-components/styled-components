// @flow

import validAttr from '@emotion/is-prop-valid'
import hoist from 'hoist-non-react-statics'
import React, { Component, createElement } from 'react'
import createWarnTooManyClasses from '../utils/createWarnTooManyClasses'
import determineTheme from '../utils/determineTheme'
import escape from '../utils/escape'
import generateDisplayName from '../utils/generateDisplayName'
import getComponentName from '../utils/getComponentName'
import isTag from '../utils/isTag'
import hasInInheritanceChain from '../utils/hasInInheritanceChain'
import StyleSheet from './StyleSheet'
import { ThemeConsumer, type Theme } from './ThemeProvider'
import { StyleSheetConsumer } from './StyleSheetManager'
import { EMPTY_OBJECT } from '../utils/empties'

import type { RuleSet, Target } from '../types'

// HACK for generating all static styles without needing to allocate
// an empty execution context every single time...
const STATIC_EXECUTION_CONTEXT = {}

const identifiers = {}

/* We depend on components having unique IDs */
function generateId(
  ComponentStyle: Function,
  _displayName: string,
  parentComponentId: string
) {
  const displayName =
    typeof _displayName !== 'string' ? 'sc' : escape(_displayName)

  /**
   * This ensures uniqueness if two components happen to share
   * the same displayName.
   */
  const nr = (identifiers[displayName] || 0) + 1
  identifiers[displayName] = nr

  const componentId = `${displayName}-${ComponentStyle.generateName(
    displayName + nr
  )}`

  return parentComponentId !== undefined
    ? `${parentComponentId}-${componentId}`
    : componentId
}

// $FlowFixMe
class BaseStyledComponent extends Component<*> {
  static target: Target
  static styledComponentId: string
  static attrs: Object
  static componentStyle: Object
  static defaultProps: Object
  static warnTooManyClasses: Function

  renderOuter: Function
  renderInner: Function
  styleSheet: ?StyleSheet

  attrs = {}

  constructor() {
    super()
    this.renderOuter = this.renderOuter.bind(this)
    this.renderInner = this.renderInner.bind(this)
  }

  render() {
    return <StyleSheetConsumer>{this.renderOuter}</StyleSheetConsumer>
  }

  renderOuter(styleSheet?: StyleSheet) {
    this.styleSheet = styleSheet

    return <ThemeConsumer>{this.renderInner}</ThemeConsumer>
  }

  renderInner(theme?: Theme) {
    const { styledComponentId, target, componentStyle } = this.constructor
    const { defaultProps } = this.props.forwardedClass

    const isTargetTag = isTag(target)

    let generatedClassName
    if (componentStyle.isStatic) {
      generatedClassName = this.generateAndInjectStyles(
        STATIC_EXECUTION_CONTEXT,
        this.props,
        this.styleSheet
      )
    } else if (theme !== undefined) {
      const determinedTheme = determineTheme(this.props, theme, defaultProps)

      generatedClassName = this.generateAndInjectStyles(
        determinedTheme,
        this.props,
        this.styleSheet
      )
    } else {
      generatedClassName = this.generateAndInjectStyles(
        this.props.theme || EMPTY_OBJECT,
        this.props,
        this.styleSheet
      )
    }

    const propsForElement: Object = { ...this.attrs }

    let key
    for (key in this.props) {
      if (key === 'forwardedRef') propsForElement.ref = this.props[key]
      // Don't pass through non HTML tags through to HTML elements
      else if ((key !== 'forwardedClass' && !isTargetTag) || validAttr(key)) {
        propsForElement[key] =
          key === 'style' && key in this.attrs
            ? { ...this.attrs[key], ...this.props[key] }
            : this.props[key]
      }
    }

    propsForElement.className = [
      this.props.className,
      styledComponentId,
      this.attrs.className,
      generatedClassName,
    ]
      .filter(Boolean)
      .join(' ')

    return createElement(target, propsForElement)
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

  generateAndInjectStyles(
    theme: any,
    props: any,
    styleSheet: ?StyleSheet = StyleSheet.master
  ) {
    const { attrs, componentStyle, warnTooManyClasses } = this.constructor

    // statically styled-components don't need to build an execution context object,
    // and shouldn't be increasing the number of class names
    if (componentStyle.isStatic && attrs === undefined) {
      return componentStyle.generateAndInjectStyles(
        STATIC_EXECUTION_CONTEXT,
        styleSheet
      )
    } else {
      const executionContext = this.buildExecutionContext(theme, props)
      const className = componentStyle.generateAndInjectStyles(
        executionContext,
        styleSheet
      )

      if (
        process.env.NODE_ENV !== 'production' &&
        warnTooManyClasses !== undefined
      ) {
        warnTooManyClasses(className)
      }

      return className
    }
  }
}

export default (ComponentStyle: Function) => {
  function createStyledComponent(
    target: Target,
    options: Object,
    rules: RuleSet
  ) {
    const {
      isClass = !isTag(target),
      displayName = generateDisplayName(target),
      componentId = generateId(
        ComponentStyle,
        options.displayName,
        options.parentComponentId
      ),
      ParentComponent = BaseStyledComponent,
      attrs,
    } = options

    const styledComponentId =
      options.displayName && options.componentId
        ? `${escape(options.displayName)}-${options.componentId}`
        : options.componentId || componentId

    const componentStyle = new ComponentStyle(rules, attrs, styledComponentId)

    class StyledComponent extends ParentComponent {
      static attrs = attrs
      static componentStyle = componentStyle
      static displayName = displayName
      static styledComponentId = styledComponentId
      static target = target

      static withComponent(tag: Target) {
        const { componentId: previousComponentId, ...optionsToCopy } = options

        const newComponentId =
          previousComponentId &&
          `${previousComponentId}-${
            isTag(tag) ? tag : escape(getComponentName(tag))
          }`

        const newOptions = {
          ...optionsToCopy,
          componentId: newComponentId,
          ParentComponent: StyledComponent,
        }

        return createStyledComponent(tag, newOptions, rules)
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      StyledComponent.warnTooManyClasses = createWarnTooManyClasses(displayName)
    }

    const Forwarded = React.forwardRef((props, ref) => (
      <StyledComponent
        {...props}
        forwardedClass={Forwarded}
        forwardedRef={ref}
      />
    ))

    /**
     * forwardRef creates a new interim component, so we need to lift up all the
     * stuff from StyledComponent such that integrations expecting the static properties
     * to be available will work
     */
    hoist(Forwarded, StyledComponent)

    if (isClass) {
      // $FlowFixMe
      hoist(Forwarded, target, {
        // all SC-specific things should not be hoisted
        attrs: true,
        componentStyle: true,
        displayName: true,
        styledComponentId: true,
        target: true,
        warnTooManyClasses: true,
        withComponent: true,
      })
    }

    Forwarded.displayName = StyledComponent.displayName

    return Forwarded
  }

  return createStyledComponent
}
