import React from 'react'
import styled from 'styled-components'
import rem from 'polished/lib/helpers/rem'

import titleToDash from '../utils/titleToDash'
import Anchor from './Anchor'

const Wrapper = styled.div`
  margin-bottom: ${rem(90)};
`

const SectionLayout = ({ children, title }) => {
  const hash = titleToDash(title)

  return (
    <Wrapper id={hash}>
      <Anchor href={`#${hash}`}>
        {title}
      </Anchor>

      {children}
    </Wrapper>
  )
}

export default SectionLayout
