import styled from 'styled-components'
import rem from 'polished/lib/helpers/rem'

const Head = styled.div`
  height: auto;

  @media (max-width: 1000px) {
    height: ${rem(70)};
  }
`

export default Head
