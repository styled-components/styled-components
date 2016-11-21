// @flow

import { createElement } from 'react'

import validAttr from '../utils/validAttr'
import isTag from '../utils/isTag'
import type { RuleSet, Target } from '../types'

import AbstractStyledComponent from './AbstractStyledComponent'
import { CHANNEL } from './ThemeProvider'

/* We depend on components having unique IDs */
const identifiers = {}
const safeDisplayName = (displayName: string) => (
  displayName
    .replace(/[[\].#*$><+~=|^:(),"'`]/g, '-') // Replace all possible CSS selectors
    .replace(/--+/g, '-') // Replace multiple -- with single -
)

export default (ComponentStyle: Function) => {
  // eslint-disable-next-line no-undef
  const createStyledComponent = (target: Target, rules: RuleSet, parent?: ReactClass<*>) => {
    /* Handle styled(OtherStyledComponent) differently */
    const isStyledComponent = AbstractStyledComponent.isPrototypeOf(target)
    if (!isTag(target) && isStyledComponent) {
      return createStyledComponent(target.target, target.rules.concat(rules), target)
    }

    const componentStyle = new ComponentStyle(rules)
    const ParentComponent = parent || AbstractStyledComponent

    class StyledComponent extends ParentComponent {
      static rules: RuleSet
      static target: Target
      static identifier: string

      constructor() {
        super()
        this.state = {
          theme: {},
          generatedClassName: '',
        }
      }

      generateAndInjectStyles(theme: any, props: any) {
        const executionContext = { ...props, theme }
        return componentStyle.generateAndInjectStyles(executionContext, StyledComponent.identifier)
      }

      componentWillMount() {
        // If there is a theme in the context, subscribe to the event emitter. This
        // is necessary due to pure components blocking context updates, this circumvents
        // that by updating when an event is emitted
        if (this.context[CHANNEL]) {
          const subscribe = this.context[CHANNEL]
          this.unsubscribe = subscribe(theme => {
            // This will be called once immediately
            const generatedClassName = this.generateAndInjectStyles(theme, this.props)
            this.setState({ theme, generatedClassName })
          })
        } else {
          const generatedClassName = this.generateAndInjectStyles(
            this.props.theme || {},
            this.props
          )
          this.setState({ generatedClassName })
        }
      }

      componentWillReceiveProps(nextProps: any) {
        const generatedClassName = this.generateAndInjectStyles(
          this.state.theme || this.props.theme,
          nextProps
        )
        this.setState({ generatedClassName })
      }

      componentWillUnmount() {
        if (this.unsubscribe) {
          this.unsubscribe()
        }
      }

      render() {
        const { className, children, innerRef } = this.props
        const { generatedClassName } = this.state

        const propsForElement = {}
        /* Don't pass through non HTML tags through to HTML elements */
        Object.keys(this.props)
          .filter(propName => !isTag(target) || validAttr(propName))
          .forEach(propName => {
            propsForElement[propName] = this.props[propName]
          })
        propsForElement.className = [className, StyledComponent.identifier, generatedClassName].filter(x => x).join(' ')
        if (innerRef) {
          propsForElement.ref = innerRef
        }

        return createElement(target, propsForElement, children)
      }
    }

    let displayName = isTag ? `styled.${target}` : `Styled(${target.displayName})`
    const generateIdentifierFromDisplayName = (includeDisplayName: boolean) => {
      const nr = (identifiers[displayName] || 0) + 1
      identifiers[displayName] = nr
      const hash = componentStyle.generateName(displayName + nr)
      StyledComponent.identifier = `${includeDisplayName ? safeDisplayName(displayName) : 'sc'}-${hash}`
    }
    generateIdentifierFromDisplayName(false)

    Object.defineProperty(StyledComponent, 'displayName', {
      get() {
        return displayName
      },
      set(newName) {
        console.log('SETTING DISPLAY NAME')
        displayName = newName
        generateIdentifierFromDisplayName(true)
      },
      enumerable: true,
    })
    StyledComponent.target = target
    StyledComponent.rules = rules

    return StyledComponent
  }

  return createStyledComponent
}
