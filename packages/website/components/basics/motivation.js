import React from 'react'
import styled from 'styled-components'

import SectionLayout from '../SectionLayout'
import Note from '../Note'
import rem from '../../utils/rem'

const videoHtml = (`
<iframe width="560" height="315" src="https://www.youtube.com/embed/bIK2NwoK9xk?start=89" frameborder="0" allowfullscreen></iframe>
`).trim()

const Video = styled.div.attrs({
  dangerouslySetInnerHTML: {
    __html: videoHtml
  }
})`
  display: inline-block;
  box-shadow: ${rem(1)} ${rem(1)} ${rem(20)} rgba(20, 20, 20, 0.27);
  margin: ${rem(35)} 0;
`

const Motivation = () => (
  <SectionLayout title="Motivation">
    <p>
      This talk by Max Stoiber is a really thorough introduction to styled-components
      and goes through what the motivations behind its creation were, along with some
      other information to get started with.
    </p>

    <Video />
  </SectionLayout>
)

export default Motivation
