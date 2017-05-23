import styled, { css } from 'styled-components'

import rem from '../../utils/rem'
import { mobile } from '../../utils/media'
import { violetRed, gold } from '../../utils/colors'
import { headerFont } from '../../utils/fonts'
import captureScroll from '../CaptureScroll'

const Sidebar = styled.nav`
  position: fixed;
  transform: translateZ(0);
  display: block;
  z-index: 1;
  font-family: ${headerFont};

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

export default captureScroll(Sidebar)
