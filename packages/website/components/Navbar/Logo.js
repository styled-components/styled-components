import styled, { css } from 'styled-components'

import rem from '../../utils/rem'
import { mobile } from '../../utils/media'

const Logo = styled.div`
  display: inline-block;
  width: 100%;
  height: 100%;

  box-sizing: border-box;

  background-image: url(/static/logo.png);
  background-size: contain;
  background-position: center;

  ${mobile(css`
    background-image: url(/static/icon.png);
    background-position: center;
    width: ${rem(70)};
    height: ${rem(70)};
  `)}
`

export default Logo
