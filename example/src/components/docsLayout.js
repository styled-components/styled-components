import React from 'react'
import { Container, Content, Title } from './layout'

const DocsLayout = ({title, children}) => (
  <Container>
    <Content>
      <Title>
        {title}
      </Title>

      {children}
    </Content>
  </Container>
);

export default DocsLayout;