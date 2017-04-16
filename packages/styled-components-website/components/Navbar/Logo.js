import styled from 'styled-components'
import rem from 'polished/lib/helpers/rem'

const Logo = styled.div`
  display: inline-block;
  width: 100%;
  height: 100%;

  box-sizing: border-box;

  background-image: url(/static/logo.png);
  background-size: contain;
  background-position: center;

  @media (max-width: 1000px) {
    background-image: url(/static/icon.png);
    width: ${rem(70)};
  }
`

export default Logo
