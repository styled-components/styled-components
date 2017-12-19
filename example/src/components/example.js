import React from 'react'
import styled from '../../../src/index'
import { Title } from './layout'

const ExampleContent = styled.div`
  margin: 10px auto;
  text-align: center;
`

const Example = ({title, children}) => (
  <ExampleContent>
    <Title>
      {title}
    </Title>

    {children}

    <hr />
  </ExampleContent>
)

export default Example