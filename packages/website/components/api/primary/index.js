import React from 'react'
import SectionLayout from '../../SectionLayout'

import Styled from './styled'
import TaggedTemplateLiteral from './tagged-template-literal'
import StyledComponent from './styled-component'
import ThemeProvider from './theme-provider'

const Primary = () => (
  <SectionLayout title="Primary">
    <Styled />

    <br /><br />

    <TaggedTemplateLiteral />

    <br /><br />

    <StyledComponent />

    <br /><br />

    <ThemeProvider />
  </SectionLayout>
)

export default Primary
