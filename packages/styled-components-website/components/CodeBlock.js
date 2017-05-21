import React, { Component } from 'react'
import styled from 'styled-components'
import rem from 'polished/lib/helpers/rem'
import { highlight, languages } from 'prismjs/components/prism-core'

import { darkGrey } from '../utils/colors'
import '../utils/prismTemplateString'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'

const prism = (code, language) => {
  if (!language || !languages[language]) {
    return undefined
  }

  return highlight(code, languages[language])
}

const Highlight = styled.pre.attrs({
  className: 'prism-code'
})`
  background: ${darkGrey};
  font-size: 0.8rem;
  font-family: monospace;
  white-space: pre-wrap;

  border-radius: ${rem(3)};
  box-shadow: 1px 1px 20px rgba(20, 20, 20, 0.27);
  margin: ${rem(35)} 0;

  overflow-x: hidden;
`

class CodeBlock extends Component {
  state = {
    __html: prism(this.props.code, this.props.language)
  }

  componentWillReceiveProps({ code, language }) {
    if (code !== this.props.code || language !== this.props.language) {
      this.setState({
        __html: prism(code, language)
      })
    }
  }

  render() {
    const { code } = this.props
    const { __html } = this.state

    if (!__html) {
      return (
        <Highlight
          {...this.props}
          code={undefined}
          language={undefined}
        >
          {code}
        </Highlight>
      )
    }

    return (
      <Highlight
        dangerouslySetInnerHTML={{ __html }}
        {...this.props}
        code={undefined}
        language={undefined}
      />
    )
  }
}

export default CodeBlock
