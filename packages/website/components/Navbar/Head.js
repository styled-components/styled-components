import styled, { css } from 'styled-components'

import rem from '../../utils/rem'
import { mobile } from '../../utils/media'

const Head = styled.div`
  height: ${rem(300)};
  padding: ${rem(65)} ${rem(85)} ${rem(45)};

  ${mobile(css`
    display: flex;
    flex-direction: row;
    align-items: center;

    height: ${rem(70)};
    padding: 0 ${rem(15)};
  `)}
`

export default Head
