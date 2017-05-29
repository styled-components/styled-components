import styled from 'styled-components'
import rem from '../utils/rem'
import { lightGrey } from '../utils/colors'
import { monospace } from '../utils/fonts'

import '../utils/prismTemplateString'
import { Editor } from 'react-live'

const Code = styled.span`
  font-family: ${monospace};
  font-weight: 500;
`

export default Code
