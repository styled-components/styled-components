import React, { Component } from 'react'
import { Content } from './layout'
import Css from './examples/css'
import Example from './example'

class App extends Component {
  render() {
    return (
      <Content>
        <Example title={'css'}>
          <Css withCss>
            With Css Mixin
          </Css>

          <Css>
            Without Css Mixin
          </Css>
          
          <Css withCss inverted>
            With inverted Css Mixin
          </Css>
        </Example>

        <Example title={'Another example (to be added...)'}>
          Some Content...
        </Example>
      </Content>
    )
  }
}

export default App