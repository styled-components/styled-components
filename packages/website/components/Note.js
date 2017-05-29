import styled from 'styled-components'

import rem from '../utils/rem'
import { lightVioletRed, violetRed } from '../utils/colors'
import { bodyFont, headerFont } from '../utils/fonts'

const Note = styled.div`
  font-family: ${bodyFont};
  background: ${lightVioletRed};
  padding: ${rem(7)} ${rem(10)} ${rem(10)} ${rem(14)};
  border-left: ${rem(4)} solid ${violetRed};
  margin: ${rem(45)} 0;
  border-radius: ${rem(3)}
`

const NoteLabel = styled.strong`
  display: block;
  font-weight: 600;
  font-family: ${headerFont};
  text-transform: uppercase;
  font-size: 90%;
  margin-bottom: ${rem(7)};
`

export default ({ label = 'Note', children }) => (
  <Note>
    <NoteLabel>{label}</NoteLabel>
    {children}
  </Note>
)
