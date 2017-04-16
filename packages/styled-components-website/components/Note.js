import styled from 'styled-components'
import rem from 'polished/lib/helpers/rem'
import { lightVioletRed, violetRed } from '../utils/colors'

const Note = styled.div`
  position: relative;

  background: ${lightVioletRed};
  padding: ${rem(35)} ${rem(10)} ${rem(10)} ${rem(14)};
  border-left: ${rem(4)} solid ${violetRed};
  margin: ${rem(20)} 0;
  border-radius: ${rem(3)}
`

const NoteLabel = styled.strong`
  position: absolute;
  top: ${rem(7)};

  display: block;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 90%;
`

export default ({ label = 'Note', children }) => (
  <Note>
    <NoteLabel>{label}</NoteLabel>
    {children}
  </Note>
)
