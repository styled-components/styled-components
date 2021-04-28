import React, { useState, memo } from 'react';
import styled, { StyleSheetManager } from 'styled-components';

const colors = ["bda779", "5b2ae8", "f3912d", "85120b", "92414d", "c3866e", "2c8bda", "e1fbb", "2ce471", "ed91c6", "e38f2f", "d31016", "176b1e", "3be33d", "b5c51a", "c496c5", "b5013a", "b0e764", "fa0f7b", "32e9de", "e81de3", "260e57", "7c2114", "892e29", "5acf1d", "ffa963", "677387", "96e65f", "729a2c", "513689"]

const Header = styled.div`
  height: 50px;
  padding: 30px;
`

const ColoredComponents = colors.reduce((components, color) => {
  const component = styled.div`
    min-height: 20px;
    padding: 30px;
    background-color: #${color};
  `
  return { ...components, [color]: memo(component) }
}, {})

const ComponentsList = memo(({ children, reversed }) => (
  <>
    {(reversed ? colors.reverse() : colors).map(color => {
      const ColoredComponent = ColoredComponents[color];

      return <ColoredComponent key={color}>{children}</ColoredComponent>
    })}
  </>
));

const App = () => {
  const [shouldShowHeader, toggleHeader] = useState(false)

  return (
    <StyleSheetManager useMultipleStyles>
      <>
        <button type='button' onClick={() => toggleHeader(!shouldShowHeader)}>
          Toggle Header
        </button>
        <br />
        <ComponentsList>
          {shouldShowHeader && <Header>I AM HEADER</Header>}
          <ComponentsList reversed>
            <ComponentsList reversed />
          </ComponentsList>
        </ComponentsList>
      </>
    </StyleSheetManager>
  )
};

export default App;
