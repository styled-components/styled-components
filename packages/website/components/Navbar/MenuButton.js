import styled, { css } from 'styled-components'
import ThreeBarsIcon from 'react-octicons-svg/dist/ThreeBarsIcon'

import rem from '../../utils/rem'
import { StyledLink } from '../Link'
import { mobile } from '../../utils/media'

const MenuButton = styled(StyledLink)`
  display: none;
  height: 100%;
  padding: ${rem(20)} 0;
  margin: 0 0 0 auto;
  color: white;
  transform-origin: center;

  ${mobile(css`
    display: block;
  `)}

  &:active {
    opacity: 0.8;
    transform: scale(0.9);
  }

  &:hover {
    background: none;
  }
`

const MenuIcon = styled(ThreeBarsIcon).attrs({
  height: null,
  width: null
})`
  height: ${rem(30)};
`

export default props => (
  <MenuButton {...props}>
    <MenuIcon />
  </MenuButton>
)

