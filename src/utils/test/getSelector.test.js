// @flow
import getSelector from '../getSelector';
import styled from '../../constructors/styled';

describe('getSelector', () => {
  it('returns a strinigified id for styled component', () => {
    const StyledComponent = styled.div`
      background-color: red;
    `;
    expect(getSelector(StyledComponent)).toMatchSnapshot();
  })

  it('returns a strinigified id for a nested styled component', () => {
    const StyledComponent = styled.div`
      background-color: purple;
    `;
    const NestedComponent = styled(StyledComponent)`
      color: blue;
    `;
    expect(getSelector(NestedComponent)).toMatchSnapshot();
  })

  it('returns name if not a styled component', () => {
    const StyledComponent = 'div'
  expect(getSelector(StyledComponent)).toBe('div')
  })
})
