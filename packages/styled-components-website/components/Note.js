import styled from 'styled-components'

import rem from '../utils/rem'
import { lightVioletRed, violetRed } from '../utils/colors'
import { serif, sansSerif } from '../utils/fonts'

const Note = styled.div`
  font-family: ${serif};
  background: ${lightVioletRed};
  padding: ${rem(7)} ${rem(10)} ${rem(10)} ${rem(14)};
  border-left: ${rem(4)} solid ${violetRed};
  margin: ${rem(20)} 0;
  border-radius: ${rem(3)}
`

const NoteLabel = styled.strong`
  display: block;
  font-weight: 600;
  font-family: ${sansSerif};
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
