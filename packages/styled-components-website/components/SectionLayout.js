import React from 'react'
import styled from 'styled-components'
import rem from 'polished/lib/helpers/rem'

import { Header } from './Layout'

const Wrapper = styled.div`
  margin-bottom: ${rem(90)};
`

const SectionLayout = ({ children, title }) => (
  <Wrapper>
    <Header>
      {title}
    </Header>

    {children}
  </Wrapper>
)

export default SectionLayout
