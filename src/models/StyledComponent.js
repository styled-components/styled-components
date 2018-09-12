// @flow

import validAttr from '@emotion/is-prop-valid'
import hoist from 'hoist-non-react-statics'
import React, { Component, createElement } from 'react'
import ComponentStyle from './ComponentStyle'
import createWarnTooManyClasses from '../utils/createWarnTooManyClasses'
import determineTheme from '../utils/determineTheme'
import escape from '../utils/escape'
import generateDisplayName from '../utils/generateDisplayName'
import getComponentName from '../utils/getComponentName'
import isFunction from '../utils/isFunction'
import isTag from '../utils/isTag'
import isDerivedReactComponent from '../utils/isDerivedReactComponent'
import isStyledComponent from '../utils/isStyledComponent'
import once from '../utils/once'
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
  componentStyleInstance: Function,
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

  const componentId = `${displayName}-${componentStyleInstance.generateName(
    displayName + nr
  )}`

  return parentComponentId ? `${parentComponentId}-${componentId}` : componentId
}

const warnInnerRef = once(() =>
  // eslint-disable-next-line no-console
  console.warn(
    'The "innerRef" API has been removed in styled-components v4 in favor of React 16 ref forwarding, use "ref" instead like a typical component.'
  )
)

// $FlowFixMe
class BaseStyledComponent extends Component<*> {
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
    const {
      componentStyle,
      defaultProps,
      styledComponentId,
      target,
    } = this.props.forwardedClass

    const isTargetTag = isTag(this.props.as || target)

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
      if (key === 'forwardedClass' || key === 'as') continue
      else if (process.env.NODE_ENV !== 'production' && key === 'innerRef') {
        warnInnerRef()
      } else if (key === 'forwardedRef') propsForElement.ref = this.props[key]
      // Don't pass through non HTML tags through to HTML elements
      else if (!isTargetTag || validAttr(key)) {
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

    return createElement(this.props.as || target, propsForElement)
  }

  buildExecutionContext(theme: any, props: any, attrs: any) {
    const context = { ...props, theme }

    if (attrs === undefined) return context

    this.attrs = {}

    let attr
    let key

    /* eslint-disable guard-for-in */
    for (key in attrs) {
      attr = attrs[key]

      this.attrs[key] =
        isFunction(attr) &&
        !isDerivedReactComponent(attr) &&
        !isStyledComponent(attr)
          ? attr(context)
          : attr
    }
    /* eslint-enable */

    return { ...context, ...this.attrs }
  }

  generateAndInjectStyles(
    theme: any,
    props: any,
    styleSheet: ?StyleSheet = StyleSheet.master
  ) {
    const { attrs, componentStyle, warnTooManyClasses } = props.forwardedClass

    // statically styled-components don't need to build an execution context object,
    // and shouldn't be increasing the number of class names
    if (componentStyle.isStatic && attrs === undefined) {
      return componentStyle.generateAndInjectStyles(
        STATIC_EXECUTION_CONTEXT,
        styleSheet
      )
    } else {
      const executionContext = this.buildExecutionContext(
        theme,
        props,
        props.forwardedClass.attrs
      )

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

export default function createStyledComponent(
  target: Target,
  options: Object,
  rules: RuleSet
) {
  const isTargetStyledComp = isStyledComponent(target)
  const isClass = !isTag(target)

  const {
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

  // fold the underlying StyledComponent attrs up (implicit extend)
  const finalAttrs =
    // $FlowFixMe
    isTargetStyledComp && target.attrs ? { ...target.attrs, ...attrs } : attrs

  const componentStyle = new ComponentStyle(
    isTargetStyledComp
      ? // fold the underlying StyledComponent rules up (implicit extend)
        // $FlowFixMe
        target.componentStyle.rules.concat(rules)
      : rules,
    finalAttrs,
    styledComponentId
  )

  /**
   * forwardRef creates a new interim component, which we'll take advantage of
   * instead of extending ParentComponent to create _another_ interim class
   */
  const StyledComponent = React.forwardRef((props, ref) => (
    <ParentComponent
      {...props}
      forwardedClass={StyledComponent}
      forwardedRef={ref}
    />
  ))

  // $FlowFixMe
  StyledComponent.attrs = finalAttrs
  // $FlowFixMe
  StyledComponent.componentStyle = componentStyle
  StyledComponent.displayName = displayName
  // $FlowFixMe
  StyledComponent.styledComponentId = styledComponentId

  // fold the underlying StyledComponent target up since we folded the styles
  // $FlowFixMe
  StyledComponent.target = isTargetStyledComp ? target.target : target

  // $FlowFixMe
  StyledComponent.withComponent = function withComponent(tag: Target) {
    const { componentId: previousComponentId, ...optionsToCopy } = options

    const newComponentId =
      previousComponentId &&
      `${previousComponentId}-${
        isTag(tag) ? tag : escape(getComponentName(tag))
      }`

    const newOptions = {
      ...optionsToCopy,
      attrs: finalAttrs,
      componentId: newComponentId,
      ParentComponent,
    }

    return createStyledComponent(tag, newOptions, rules)
  }

  if (process.env.NODE_ENV !== 'production') {
    // $FlowFixMe
    StyledComponent.warnTooManyClasses = createWarnTooManyClasses(displayName)
  }

  if (isClass) {
    hoist(StyledComponent, target, {
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

  return StyledComponent
}
