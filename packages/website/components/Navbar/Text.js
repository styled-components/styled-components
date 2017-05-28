import styled, { css } from 'styled-components'

import rem from '../../utils/rem'
import { mobile } from '../../utils/media'

const Text = styled.div`
  display: none;
  margin-left: ${rem(15)};
  margin-top: ${rem(5)};
  font-size: ${rem(18)};

  ${mobile(css`
    display: block;
  `)}
`

export default Text
