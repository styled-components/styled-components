import 'react-native'
import React from 'react'

import styled from '../index'
import { shallow, mount } from 'enzyme'

// NOTE: These tests are like the ones for Web but a "light-version" of them
// This is mostly due to the similar logic

describe('native', () => {
  it('should not throw an error when called', () => {
    expect(() => styled.View``).not.toThrowError()
  })

  it('should generate inline styles', () => {
    const Comp = styled.View``
    const wrapper = shallow(<Comp />)
    const view = wrapper.find('View').first()

    expect(view.prop('style')).toEqual([{}, undefined])
  })

  it('should combine inline styles and the style prop', () => {
    const Comp = styled.View`
      padding-top: 10;
    `

    const style = { opacity: 0.9 }
    const wrapper = shallow(<Comp style={style} />)
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

    const comp = shallow(<Comp opacity={0.5} />)

    expect(comp.find('View').prop('style')).toEqual([
      { paddingTop: 5, opacity: 0.5 },
      undefined,
    ])

    comp.setProps({ opacity: 0.9 })

    expect(comp.find('View').prop('style')).toEqual([
      { paddingTop: 5, opacity: 0.9 },
      undefined,
    ])
  })

  describe('extending', () => {
    it('should combine styles of extending components', () => {
      const Parent = styled.View`
        opacity: 0.9;
      `
      const Child = Parent.extend`
        padding: 10px;
      `

      const parent = shallow(<Parent />)
      const child = shallow(<Child />)

      expect(parent.find('View').prop('style')).toEqual([
        { opacity: 0.9 },
        undefined,
      ])

      expect(child.find('View').prop('style')).toEqual([
        {
          opacity: 0.9,
          paddingTop: 10,
          paddingRight: 10,
          paddingBottom: 10,
          paddingLeft: 10,
        },
        undefined,
      ])
    })

    it('should combine styles of extending components in >= 3 inheritances', () => {
      const GrandGrandParent = styled.View`
        background-color: red;
      `
      const GrandParent = GrandGrandParent.extend`
        border-width: 10;
      `
      const Parent = GrandParent.extend`
        opacity: 0.9;
      `
      const Child = Parent.extend`
        padding: 10px;
      `

      const grandGrandParent = shallow(<GrandGrandParent />)
      const grandParent = shallow(<GrandParent />)
      const parent = shallow(<Parent />)
      const child = shallow(<Child />)

      expect(grandGrandParent.find('View').prop('style')).toEqual([
        {
          backgroundColor: 'red',
        },
        undefined,
      ])

      expect(grandParent.find('View').prop('style')).toEqual([
        {
          backgroundColor: 'red',
          borderWidth: 10,
        },
        undefined,
      ])

      expect(parent.find('View').prop('style')).toEqual([
        {
          backgroundColor: 'red',
          borderWidth: 10,
          opacity: 0.9,
        },
        undefined,
      ])

      expect(child.find('View').prop('style')).toEqual([
        {
          backgroundColor: 'red',
          borderWidth: 10,
          opacity: 0.9,
          paddingTop: 10,
          paddingRight: 10,
          paddingBottom: 10,
          paddingLeft: 10,
        },
        undefined,
      ])
    })
  })

  describe('attrs', () => {
    it('works fine with an empty object', () => {
      const Comp = styled.View.attrs({})``
      const wrapper = shallow(<Comp />)
      const view = wrapper.find('View').first()

      expect(view.props()).toEqual({
        style: [{}, undefined],
      })
    })

    it('passes simple props on', () => {
      const Comp = styled.View.attrs({
        test: true,
      })``

      const wrapper = shallow(<Comp />)
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
      const wrapper = shallow(<Comp test={test} />)
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

      const wrapper = shallow(<Comp />)
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

      const Child = Parent.extend.attrs({
        second: 'second',
      })``

      const wrapper = shallow(<Child />)
      const view = wrapper.find('View').first()

      expect(view.props()).toEqual({
        style: [{}, undefined],
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
    it('should pass the ref to the component', () => {
      const Comp = styled.View``
      const ref = jest.fn()

      const wrapper = mount(<Comp innerRef={ref} />)
      const view = wrapper.find('View').first()
      const comp = wrapper.find(Comp).first()

      expect(ref).toHaveBeenCalledWith(view.instance())
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
  })
})
