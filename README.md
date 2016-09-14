# Styled components

**This is a work in progress** based off of [this demo](https://github.com/geelen/css-components-demo).

### Usage

** This may change at any point but it's pretty 💃 right now so... **

`npm install -D styled-components`

```jsx
import styled from 'styled-components'

const Header = styled.header`
  padding: 4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: papayawhip;
  
  > * + * {
    margin: 1rem 0 0 0;
  }
  > h1 {
    font-size: 2rem;
  }
  > h2 {
    font-size: 1.5rem;
  }
`

const Main = styled.section`
  max-width: 800px;
  margin: 0 auto;
`

const P = styled.p`
  line-height: 1.4;
  margin-bottom: 1.5rem;
`

export default () => (
  <div>
    <Header>
      <h1>Styled Components</h1>
      <h2>They're so rad!</h2>
    </Header>
    <Main>
      <P>
        Separate those concerns! JSX is for structure, styled.tagName for styling!
      </P>
      <P>
        Just gotta use component names that start with an Uppercase letter and you're good to get started!
      </P>
    </Main>
  </div>
)
```

By Glen Maddern and Max Stoiber.

With thanks to Charlie Somerville & lots of others.
