import styled from 'styled-components'
import rem from 'polished/lib/helpers/rem'

const Head = styled.div`
  height: ${rem(300)};
  padding: ${rem(65)} ${rem(85)} ${rem(45)};

  @media (max-width: 1000px) {
    display: flex;
    flex-direction: row;
    align-items: center;

    height: ${rem(70)};
    padding: 0 ${rem(15)};
  }
`

export default Head
