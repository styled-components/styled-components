import React, {Component} from 'react'
import DocsLayout from './docsLayout'
import CssComp from './css'

class App extends Component {
  render() {
    return (
      <DocsLayout title={'Integration Tests'}>
        <CssComp complex blueBackground whiteColor>
          Css
        </CssComp>
      </DocsLayout>
    )
  }
}

export default App