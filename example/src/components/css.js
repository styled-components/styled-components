import styled, { css } from '../../../src/index'

const complexMixin = css`
    background: ${props => props.blueBackground ? 'blue': 'white'};
    color: ${props => props.whiteColor ? 'white': 'black'};
`

const CssComp = styled.div`
    /* This is an example of a nested interpolation */
    ${props => props.complex ? complexMixin : 'color: blue;'}
`

export default CssComp