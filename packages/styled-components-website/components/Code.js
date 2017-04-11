import styled from 'styled-components'
import rem from 'polished/lib/helpers/rem'
import { lightGrey } from '../utils/colors'

import '../utils/prismTemplateString'
import { Editor } from 'react-live'

const Code = styled.span`
  display: inline-block;
  background: rgba(20, 20, 20, 0.1);
  font-family: monospace;
  font-size: 0.9rem;
  border-radius: ${rem(3)};
  padding: ${rem(2)} ${rem(5)};
`

export default Code
