import styled from 'styled-components'
import rem from 'polished/lib/helpers/rem'
import { violetRed } from '../utils/colors'

const Label = styled.small`
  display: inline-block;
  background: ${violetRed};
  color: white;
  font-size: 75%;
  border-radius: ${rem(3)};
  padding: ${rem(1)} ${rem(5)};
`

export default Label
