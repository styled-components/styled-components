import styled from 'styled-components'
import rem from 'polished/lib/helpers/rem'
import { lightVioletRed, violetRed } from '../utils/colors'

const Note = styled.div`
  background: ${lightVioletRed};
  padding: ${rem(7)} ${rem(10)} ${rem(10)} ${rem(14)};
  border-left: ${rem(4)} solid ${violetRed};
  margin: ${rem(20)} 0;
  border-radius: ${rem(3)}
`

const NoteLabel = styled.strong`
  display: block;
  font-weight: 600;
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
