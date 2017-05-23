import styled from 'styled-components'
import rem from '../utils/rem'
import { violetRed } from '../utils/colors'
import { headerFont } from '../utils/fonts'

const Label = styled.small`
  display: inline-block;
  background: ${violetRed};
  color: white;
  font-size: 75%;
  font-family: ${headerFont};
  border-radius: ${rem(3)};
  padding: ${rem(1)} ${rem(5)};
`

export default Label
