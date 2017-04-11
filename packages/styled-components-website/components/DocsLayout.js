import React from 'react'
import Navbar from './Navbar'
import { Container, Content, Title } from './Layout'

const DocsLayout = ({ children, title }) => (
  <Container>
    <Navbar />

    <Content>
      <Title>
        {title}
      </Title>

      {children}
    </Content>
  </Container>
)

export default DocsLayout
