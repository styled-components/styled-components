import styled from 'styled-components'
import rem from 'polished/lib/helpers/rem'
import { lightGrey } from '../utils/colors'

import '../utils/prismTemplateString'
import { Editor } from 'react-live'

const Code = styled.span`
  display: inline-block;
  background: ${lightGrey};
  font-family: monospace;
  font-size: 90%;
  border-radius: ${rem(3)};
  padding: ${rem(2)} ${rem(5)};
`

export default Code
