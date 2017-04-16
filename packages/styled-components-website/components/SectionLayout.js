import React from 'react'
import styled from 'styled-components'
import rem from 'polished/lib/helpers/rem'

import titleToDash from '../utils/titleToDash'
import Anchor from './Anchor'

const Wrapper = styled.div`
  margin-bottom: ${p => p.sub ? rem(50) : rem(90)};
`

const SectionLayout = ({ children, title, sub }) => {
  const hash = titleToDash(title)

  return (
    <Wrapper id={hash} sub={sub}>
      <Anchor href={`#${hash}`} sub={sub}>
        {title}
      </Anchor>

      {children}
    </Wrapper>
  )
}

export default SectionLayout
