import React from 'react'
import Head from 'next/head'
import Navbar from './Navbar'
import { Container, Content, Title } from './Layout'

const DocsLayout = ({ children, title }) => (
  <Container>
    <Head>
      <title>styled-components: {title}</title>
      <meta name="twitter:title" content={`styled-components: ${title}`} />
    </Head>

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
