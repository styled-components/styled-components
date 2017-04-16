import styled, { css } from 'styled-components'
import rem from 'polished/lib/helpers/rem'
import { mobile } from '../../utils/media'
import { violetRed, gold } from '../../utils/colors'

const Sidebar = styled.nav`
  position: fixed;
  display: block;
  z-index: 1;

  left: 0;
  top: 0;
  bottom: 0;
  right: auto;

  width: ${rem(300)};
  height: 100%;
  background: linear-gradient(20deg, ${violetRed}, ${gold});
  box-sizing: border-box;
  color: white;
  overflow-y: scroll;

  ${mobile(css`
    bottom: auto;
    right: 0;
    height: auto;
    width: 100%;
    overflow-y: visible;
  `)}
`

export default Sidebar
