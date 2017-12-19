import styled, { css } from '../../../../src/index'

const cssMixin = css`
    background: ${props => props.inverted ? 'palevioletred': 'papayawhip'};
    color: ${props => props.inverted ? 'papayawhip': 'palevioletred'};
`

const Css = styled.div`
    width: 100%;
    padding: 100px 0;
    margin: 5px 0;

    ${props => props.withCss ? cssMixin : ''}
`

export default Css