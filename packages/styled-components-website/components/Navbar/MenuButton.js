import styled from 'styled-components'
import rem from 'polished/lib/helpers/rem'
import { StyledLink } from '../Link'
import { ThreeBarsIcon } from 'react-octicons-svg'

const MenuButton = styled(StyledLink)`
  display: none;
  height: 100%;
  margin-left: ${rem(15)};
  padding: ${rem(20)};
  margin-left: auto;

  @media (max-width: 1000px) {
    display: block;
  }
`

const MenuIcon = styled(ThreeBarsIcon).attrs({
  height: null,
  width: null
})`
  height: 100%;
`

export default props => (
  <MenuButton {...props}>
    <MenuIcon />
  </MenuButton>
)

