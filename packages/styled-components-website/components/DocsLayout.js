import React from 'react'
import Navbar from './Navbar'
import { Container, Content, Title } from './Layout'

import pathnameToTitle from '../utils/pathnameToTitle'

const DocsLayout = ({ children, url }) => (
  <Container>
    <Navbar />

    <Content>
      <Title>
        {pathnameToTitle(url.pathname)}
      </Title>

      {children}
    </Content>
  </Container>
)

export default DocsLayout
