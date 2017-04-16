import styled from 'styled-components'
import rem from 'polished/lib/helpers/rem'

const Text = styled.div`
  display: none;
  margin-left: ${rem(15)};
  margin-top: ${rem(8)};
  font-size: ${rem(18)};

  @media (max-width: 1000px) {
    display: block;
  }
`

export default Text
