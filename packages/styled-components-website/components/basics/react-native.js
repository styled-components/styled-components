import React from 'react'
import SectionLayout from '../SectionLayout'
import CodeBlock from '../CodeBlock'
import Code from '../Code'

const sample = (`
import styled from 'styled-components/native';

const StyledView = styled.View\`
  background-color: papayawhip;
\`;

const StyledText = styled.Text\`
  color: palevioletred;
\`;

class MyReactNativeComponent extends React.Component {
  render() {
    return (
      <StyledView>
        <StyledText>Hello World!</StyledText>
      </StyledView>
    )
  }
}
`).trim()

const cssToReactNativeSample = (`
const RotatedBox = styled.View\`
  transform: rotate(90deg);
  text-shadow-offset: 10 5;
  font-variant: small-caps;
  margin: 5 7 2;
\`;
`).trim()

const ReactNative = () => (
  <SectionLayout title="React Native">
    <p>
      styled-components has a ReactNative mode that works exactly the same,
      except you import the things from <Code>styled-components/native</Code>.
    </p>

    <CodeBlock code={sample} />

    <p>
      We also support more complex styles (like transform), which would normally be an array,
      and shorthands (e.g. for margin) thanks to <Code>css-to-react-native</Code>!
      Imagine how you'd write the property in React Native, guess how you'd transfer
      it to CSS and you're probably right:
    </p>

    <CodeBlock code={cssToReactNativeSample} />

    <p>
      Some of the differences to the regular web-version are, that you cannot use
      the <Code>keyframes</Code> and <Code>injectGlobal</Code> helpers since React Native doesn't
      support keyframes or global styles. We will also warn you if you use media queries or nest your CSS.
    </p>
  </SectionLayout>
)

export default ReactNative
