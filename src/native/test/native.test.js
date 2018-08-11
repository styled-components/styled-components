// @flow
import 'react-native'
import { View, Text } from 'react-native'
import React from 'react'

import styled from '../index'
import { shallow, mount } from 'enzyme'

// NOTE: These tests are like the ones for Web but a "light-version" of them
// This is mostly due to the similar logic

describe('native', () => {
  it('should not throw an error when called with a valid element', () => {
    expect(() => styled.View``).not.toThrowError()

    const FunctionalComponent = () => <View />
    class ClassComponent extends React.Component {
      render() {
        return <View />
      }
    }
    const validComps = ['View', FunctionalComponent, ClassComponent]
    validComps.forEach(comp => {
      expect(() => {
        const Comp = styled(comp)
        mount(<Comp />)
      }).not.toThrowError()
    })
  })

  it('should throw a meaningful error when called with an invalid element', () => {
    const FunctionalComponent = () => <View />
    class ClassComponent extends React.Component {
      render() {
        return <View />
      }
    }
    const invalidComps = [
      undefined,
      null,
      123,
      [],
      <View />,
      <FunctionalComponent />,
      <ClassComponent />,
    ]
    invalidComps.forEach(comp => {
      expect(() => {
        // $FlowInvalidInputTest
        const Comp = styled(comp)
        shallow(<Comp />)
        // $FlowInvalidInputTest
      }).toThrow(`Cannot create styled-component for component: ${comp}`)
    })
  })

  it('should generate inline styles', () => {
    const Comp = styled.View``
    const wrapper = mount(<Comp />)
    const view = wrapper.find('View').first()

    expect(view.prop('style')).toEqual([{}, undefined])
  })

  it('should combine inline styles and the style prop', () => {
    const Comp = styled.View`
      padding-top: 10;
    `

    const style = { opacity: 0.9 }
    const wrapper = mount(<Comp style={style} />)
    const view = wrapper.find('View').first()

    expect(view.prop('style')).toEqual([{ paddingTop: 10 }, style])
  })

  it('should not console.warn if a comment is seen', () => {
    const oldConsoleWarn = console.warn
    console.warn = jest.fn()
    try {
      styled.View`
        /* this is a comment */
      `

      expect(console.warn).not.toHaveBeenCalled()
    } finally {
      console.warn = oldConsoleWarn
    }
  })

  // https://github.com/styled-components/styled-components/issues/1266
  it('should update when props change', () => {
    const Comp = styled.View`
      padding-top: 5px;
      opacity: ${p => p.opacity || 0};
    `

    const comp = mount(<Comp opacity={0.5} />)

    const test = mount(
      <View>
        <Text>Hello</Text>
      </View>
    )

    test.debug()

    expect(
      comp
        .find('View')
        .first()
        .prop('style')
    ).toEqual([{ paddingTop: 5, opacity: 0.5 }, undefined])

    comp.setProps({ opacity: 0.9 })

    expect(
      comp
        .find('View')
        .first()
        .prop('style')
    ).toEqual([{ paddingTop: 5, opacity: 0.9 }, undefined])
  })

          .prop('style')
      ).toEqual([{ opacity: 0.9 }, undefined])
        child
          .find('View')
          .first()
          .prop('style')
      ).toEqual([
        grandGrandParent
          .find('View')
          .first()
          .prop('style')
      ).toEqual([
        grandParent
          .find('View')
          .first()
          .prop('style')
      ).toEqual([
        parent
          .find('View')
          .first()
          .prop('style')
      ).toEqual([
        child
          .find('View')
          .first()
          .prop('style')
      ).toEqual([
  describe('attrs', () => {
    it('works fine with an empty object', () => {
      const Comp = styled.View.attrs({})``
      const wrapper = mount(<Comp />)
      const view = wrapper.find('View').first()

      expect(view.props()).toEqual({
        style: [{}, undefined],
      })
    })

    it('passes simple props on', () => {
      const Comp = styled.View.attrs({
        test: true,
      })``

      const wrapper = mount(<Comp />)
      const view = wrapper.find('View').first()

      expect(view.props()).toEqual({
        style: [{}, undefined],
        test: true,
      })
    })

    it('calls an attr-function with context', () => {
      const Comp = styled.View.attrs({
        copy: props => props.test,
      })``

      const test = 'Put that cookie down!'
      const wrapper = mount(<Comp test={test} />)
      const view = wrapper.find('View').first()

      expect(view.props()).toEqual({
        style: [{}, undefined],
        copy: test,
        test,
      })
    })

    it('merges multiple calls', () => {
      const Comp = styled.View.attrs({
        first: 'first',
        test: '_',
      }).attrs({
        second: 'second',
        test: 'test',
      })``

      const wrapper = mount(<Comp />)
      const view = wrapper.find('View').first()

      expect(view.props()).toEqual({
        style: [{}, undefined],
        first: 'first',
        second: 'second',
        test: 'test',
      })
    })

    it('merges attrs when inheriting SC', () => {
      const Parent = styled.View.attrs({
        first: 'first',
      })``

      const Child = styled(Parent).attrs({
        second: 'second',
      })``

      const wrapper = mount(<Child />)
      const view = wrapper.find('View').first()

      expect(view.props()).toMatchObject({
        style: [{}, [{}, undefined]],
        first: 'first',
        second: 'second',
      })
    })
  })

  describe('expanded API', () => {
    it('should attach a displayName', () => {
      const Comp = styled.View``
      expect(Comp.displayName).toBe('Styled(View)')

      const CompTwo = styled.View.withConfig({ displayName: 'Test' })``
      expect(CompTwo.displayName).toBe('Test')
    })

    it('should allow multiple calls to be chained', () => {
      const Comp = styled.View.withConfig({ displayName: 'Test1' }).withConfig({
        displayName: 'Test2',
      })``

      expect(Comp.displayName).toBe('Test2')
    })
  })

  describe('innerRef', () => {
    it('should pass a callback ref to the component', () => {
      const Comp = styled.View``
      const ref = jest.fn()

      const wrapper = mount(<Comp innerRef={ref} />)
      const view = wrapper.find('View').first()
      const comp = wrapper.find(Comp).first()

      expect(ref).toHaveBeenCalledWith(view.instance())
      expect(view.prop('innerRef')).toBeFalsy()
      expect(comp.instance().root).toBeTruthy()
    })

    it('should pass an object ref to the component', () => {
      const Comp = styled.View``
      const ref = React.createRef()

      const wrapper = mount(<Comp innerRef={ref} />)
      const view = wrapper.find('View').first()
      const comp = wrapper.find(Comp).first()

      expect(ref.current).toBe(view.instance())
      expect(view.prop('innerRef')).toBeFalsy()
      expect(comp.instance().root).toBeTruthy()
    })

    it('should not leak the innerRef prop to the wrapped child', () => {
      class InnerComponent extends React.Component {
        render() {
          return null
        }
      }

      const OuterComponent = styled(InnerComponent)``
      const ref = jest.fn()

      const wrapper = mount(<OuterComponent innerRef={ref} />)
      const innerComponent = wrapper.find(InnerComponent).first()
      const outerComponent = wrapper.find(OuterComponent).first()

      expect(ref).toHaveBeenCalledWith(innerComponent.instance())
      expect(innerComponent.prop('innerRef')).toBeFalsy()
      expect(outerComponent.instance().root).toBeTruthy()
    })

    it('should pass the innerRef to the wrapped styled component', () => {
      const InnerComponent = styled.View``
      const OuterComponent = styled(InnerComponent)``
      const ref = jest.fn()

      const wrapper = mount(<OuterComponent innerRef={ref} />)
      const view = wrapper.find('View').first()
      const outerComponent = wrapper.find(OuterComponent).first()

      expect(ref).toHaveBeenCalledWith(view.instance())
      expect(outerComponent.instance().root).toBeTruthy()
    })

    it('should pass innerRef instead of ref to a wrapped stateless functional component', () => {
      const InnerComponent = () => null
      const OuterComponent = styled(InnerComponent)``
      // NOTE: A ref should always be passed, so we don't need to (setNativeProps feature)

      const wrapper = mount(<OuterComponent />)
      const outerComponent = wrapper.find(OuterComponent).first()
      const innerComponent = wrapper.find(InnerComponent).first()

      expect(innerComponent.prop('ref')).toBeFalsy()
      expect(innerComponent.prop('innerRef')).toBeTruthy()
      expect(outerComponent.instance().root).toBeFalsy()
    })

    it('should hoist non-react static properties', () => {
      const InnerComponent = styled.View``
      InnerComponent.foo = 'bar'

      const OuterComponent = styled(InnerComponent)``

      expect(OuterComponent).toHaveProperty('foo', 'bar')
    })

    it('should not hoist styled component statics', () => {
      const InnerComponent = styled.View`
        color: red;
      `
      const OuterComponent = styled(InnerComponent)`
        color: blue;
      `

      expect(OuterComponent.inlineStyle).not.toEqual(InnerComponent.inlineStyle)
    })
  })
})
