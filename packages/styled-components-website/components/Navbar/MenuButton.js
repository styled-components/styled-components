import styled, { css } from 'styled-components'
import rem from 'polished/lib/helpers/rem'
import { StyledLink } from '../Link'
import { ThreeBarsIcon } from 'react-octicons-svg'
import { mobile } from '../../utils/media'

const MenuButton = styled(StyledLink)`
  display: none;
  height: 100%;
  margin-left: ${rem(15)};
  padding: ${rem(20)} 0;
  margin-left: auto;
  color: white;
  transform-origin: center;

  ${mobile(css`
    display: block;
  `)}

  &:active {
    opacity: 0.8;
    transform: scale(0.9);
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

