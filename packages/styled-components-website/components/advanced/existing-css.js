import React from 'react'
import SectionLayout from '../SectionLayout'
import LiveEdit from '../LiveEdit'
import CodeBlock from '../CodeBlock'
import Code from '../Code'
import Note from '../Note'

const classNameSample = (`
class MyComponent extends React.Component {
  render() {
    // Attach the passed-in className to the DOM node
    return <div className={this.props.className} />;
  }
}
`).trim()

const classNameComboSample = (`
class MyComponent extends React.Component {
  render() {
    // Attach the passed-in className to the DOM node
    return <div className={\`some-global-class \${this.props.className}\`} />;
  }
}
`).trim()

const specifictySample = (`
// MyComponent.js
const MyComponent = styled.div\`background-color: green;\`;

// my-component.css
.red-bg {
  background-color: red;
}

// For some reason this component still has a green background,
// even though you're trying to override it with the "red-bg" class!
<MyComponent className="red-bg" />
`).trim()

const bumpSpecificitySample = (`
/* my-component.css */
.red-bg.red-bg {
  background-color: red;
}
`).trim()

const ExistingCSS = () => (
  <SectionLayout title="Existing CSS">
    <p>
      There are a couple of implementation details that you should be aware of, if you choose to use
      styled-components together with existing CSS.
    </p>

    <p>
      styled-components generates an actual stylesheet with classes, and attaches those classes to
      the DOM nodes of styled components via the <Code>className</Code> prop.
      It injects the generated stylesheet at the end of the head of the document during runtime.
    </p>

    <SectionLayout sub title="Styling normal React components">
      <p>
        If you use the <Code>styled(MyComponent)</Code> notation and <Code>MyComponent</Code> does not
        render the passed-in <Code>className</Code> prop, then no styles will be applied.
        To avoid this issue, make sure your component attaches the passed-in className to a DOM node:
      </p>

      <CodeBlock code={classNameSample} language="jsx" />

      <p>
        If you have pre-existing styles with a class, you can combine the global class with the
        passed-in one:
      </p>

      <CodeBlock code={classNameComboSample} language="jsx" />
    </SectionLayout>

    <SectionLayout sub title="Issues with Specificity">
      <p>
        If you apply a global class together with a styled component class, the result might not be
        what you're expecting. If a property is defined in both classes with the same specificty,
        the last one will win.
      </p>

      <CodeBlock code={specifictySample} language="jsx" />

      <p>
        In the above example the styled component class takes precendence over the global class, since
        styled-components injects its styles during runtime into the DOM at the end of the head.
        Thus its styles win over the other ones.
      </p>

      <p>
        Since it's often hard to control where your global CSS is injected into the DOM with tools like
        Webpack, the easiest thing is to bump up the specificity of your global class by repeating the
        classname:
      </p>

      <CodeBlock code={bumpSpecificitySample} language="css" />
    </SectionLayout>
  </SectionLayout>
)

export default ExistingCSS
