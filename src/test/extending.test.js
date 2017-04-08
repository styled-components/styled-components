// @flow
import React from 'react'
import PropTypes from 'prop-types';
import expect from 'expect'
import { shallow } from 'enzyme'

import { resetStyled, expectCSSMatches } from './utils'

let styled

describe('extending', () => {
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    styled = resetStyled()
  })

  it('should generate a single class with no styles', () => {
    const Parent = styled.div``
    const Child = styled(Parent)``

    shallow(<Parent />)
    shallow(<Child />)

    expectCSSMatches('.a { }')
  })

  it('should generate a single class if only parent has styles', () => {
    const Parent = styled.div`color: blue;`
    const Child = styled(Parent)``

    shallow(<Parent />)
    shallow(<Child />)

    expectCSSMatches('.a { color: blue; }')
  })

  it('should generate a single class if only child has styles', () => {
    const Parent = styled.div`color: blue;`
    const Child = styled(Parent)``

    shallow(<Parent />)
    shallow(<Child />)

    expectCSSMatches('.a { color: blue; }')
  })

  it('should generate a class for the child with the rules of the parent', () => {
    const Parent = styled.div`color: blue;`
    const Child = styled(Parent)`color: red;`

    shallow(<Child />)

    expectCSSMatches('.a { color: blue;color: red; }')
  })

  it('should generate different classes for both parent and child', () => {
    const Parent = styled.div`color: blue;`
    const Child = styled(Parent)`color: red;`

    shallow(<Parent />)
    shallow(<Child />)

    expectCSSMatches('.a { color: blue; } .b { color: blue;color: red; }')
  })

  it('should copy nested rules to the child', () => {
    const Parent = styled.div`
      color: blue;
      > h1 { font-size: 4rem; }
    `
    const Child = styled(Parent)`color: red;`

    shallow(<Parent />)
    shallow(<Child />)

    expectCSSMatches(`
      .a { color: blue; }
      .a > h1 { font-size: 4rem; }
      .b { color: blue; color: red; }
      .b > h1 { font-size: 4rem; }
    `)
  })

  it('should keep default props from parent', () => {
    const Parent = styled.div`
      color: ${(props) => props.color};
    `
    Parent.defaultProps = {
      color: 'red'
    }

    const Child = styled(Parent)`background-color: green;`

    shallow(<Parent />)
    shallow(<Child />)

    expectCSSMatches(`
      .a { color: red; }
      .b { color: red; background-color: green; }
    `)
  })

  it('should keep prop types from parent', () => {
    const Parent = styled.div`
      color: ${(props) => props.color};
    `
    Parent.propTypes = {
      color: PropTypes.string
    }

    const Child = styled(Parent)`background-color: green;`

    expect(Child.propTypes).toEqual(Parent.propTypes)
  })

  it('should keep custom static member from parent', () => {
    const Parent = styled.div`color: red;`

    Parent.fetchData = () => 1

    const Child = styled(Parent)`color: green;`

    expect(Child.fetchData).toExist()
    expect(Child.fetchData()).toEqual(1)
  })

  it('should keep static member in triple inheritance', () => {
    const GrandParent = styled.div`color: red;`
    GrandParent.fetchData = () => 1

    const Parent = styled(GrandParent)`color: red;`
    const Child = styled(Parent)`color:red;`

    expect(Child.fetchData).toExist()
    expect(Child.fetchData()).toEqual(1)
  })
})
