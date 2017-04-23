import 'react-native'
import React from 'react'

import styled from '../index'
import { shallow, mount } from 'enzyme'

// NOTE: These tests are like the ones for Web but a "light-version" of them
// This is mostly due to the similar logic

describe('native', () => {
  it('should not throw an error when called', () => {
    styled.View``
  })

  it('should generate inline styles', () => {
    const Comp = styled.View``
    const wrapper = shallow(<Comp />)
    const view = wrapper.find('View').first()

    expect(view.prop('style')).toEqual([{}])
  })

  it('should combine inline styles and the style prop', () => {
    const Comp = styled.View`
      padding-top: 10;
    `

    const style = { opacity: 0.9 }
    const wrapper = shallow(<Comp style={style} />)
    const view = wrapper.find('View').first()

    expect(view.prop('style')).toEqual([ { paddingTop: 10 }, style ])
  })

  describe('extending', () => {
    it('should combine styles of extending components', () => {
      const Parent = styled.View`opacity: 0.9;`
      const Child = Parent.extend`padding: 10px;`

      const parent = shallow(<Parent />)
      const child = shallow(<Child />)

      expect(parent.find('View').prop('style')).toEqual([
        { opacity: 0.9 }
      ])

      expect(child.find('View').prop('style')).toEqual([
        {
          opacity: 0.9,
          paddingTop: 10,
          paddingRight: 10,
          paddingBottom: 10,
          paddingLeft: 10
        }
      ])
    })
  })

  describe('withProps', () => {
    it('work fine with a function returning an empty object', () => {
      const Comp = styled.View.withProps(() => ({}))``
      const view = shallow(<Comp />).find('View').first()

      expect(view.props()).toEqual({
        style: [{}]
      })
    })

    it('works with returning an object with a simple prop', () => {
      const Comp = styled.View.withProps(() => ({
        type: 'button'
      }))``

      const view = shallow(<Comp />).find('View').first()

      expect(view.props()).toEqual({
        type: 'button',
        style: [{}]
      })
    })

    it('receives props in the transformer function', () => {
      const Comp = styled.View.withProps(props => ({
        type: props.submit ? 'submit' : 'button',
        submit: undefined
      }))``

      const view = shallow(<Comp />).find('View').first()

      expect(view.props()).toEqual({
        type: 'button',
        style: [{}]
      })

      const view2 = shallow(<Comp submit/>).find('View').first()

      expect(view2.props()).toEqual({
        type: 'submit',
        style: [{}]
      })
    })

    it('merges the result with existing props', () => {
      const Comp = styled.View.withProps(props => ({
        disabled: true
      }))``

      const view = shallow(<Comp type="text"/>).find('View').first()

      expect(view.props()).toEqual({
        children: undefined,
        disabled: true,
        style: [{}],
        type: 'text'
      })
    })

    it('composes chained withProps', () => {
      const Comp = styled.View.withProps(() => ({
        type: 'button',
      })).withProps(() => ({
        tabIndex: 0
      }))``

      const view = shallow(<Comp />).find('View').first()

      expect(view.props()).toEqual({
        children: undefined,
        type: 'button',
        tabIndex: 0,
        style: [{}]
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
      const Comp = styled.View
        .withConfig({ displayName: 'Test1' })
        .withConfig({ displayName: 'Test2' })
        ``

      expect(Comp.displayName).toBe('Test2')
    })
  })

  describe('innerRef', () => {
    it('should pass the ref to the component', () => {
      const Comp = styled.View``
      const ref = jest.fn()

      const wrapper = mount(<Comp innerRef={ref} />)
      const view = wrapper.find('View').first()

      // $FlowFixMe
      expect(ref).toHaveBeenCalledWith(view.node)
      expect(view.prop('innerRef')).toBeFalsy()
    })

    class InnerComponent extends React.Component {
      render() {
        return null
      }
    }

    it('should not leak the innerRef prop to the wrapped child', () => {
      const OuterComponent = styled(InnerComponent)``
      const ref = jest.fn()

      const wrapper = mount(<OuterComponent innerRef={ref} />)
      const innerComponent = wrapper.find(InnerComponent).first()

      // $FlowFixMe
      expect(ref).toHaveBeenCalledWith(innerComponent.node)
      expect(innerComponent.prop('innerRef')).toBeFalsy()
    })

    it('should pass the innerRef to the wrapped styled component', () => {
      const InnerComponent = styled.View``
      const OuterComponent = styled(InnerComponent)``
      const ref = jest.fn()

      const wrapper = mount(<OuterComponent innerRef={ref} />)
      const view = wrapper.find('View').first()
      const innerComponent = wrapper.find(InnerComponent).first()

      // $FlowFixMe
      expect(ref).toHaveBeenCalledWith(view.node)
      expect(innerComponent.prop('innerRef')).toBe(ref)
    })
  })
})
