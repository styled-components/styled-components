# React Native


`styled-components` has a ReactNative mode that works _exactly_ the same, except you import the things from `styled-components/native`:

```JSX
import styled from 'styled-components/native';

const StyledView = styled.View`
  background-color: papayawhip;
`;

const StyledText = styled.Text`
  color: palevioletred;
`;

class MyReactNativeComponent extends React.Component {
  render() {
    return (
      <StyledView>
        <StyledText>Hello World!</StyledText>
      </StyledView>
    )
  }
}
```

We also support more complex styles (like `transform`), which would normally be an array, and shorthands (e.g. for `margin`) thanks to [`css-to-react-native`](https://github.com/styled-components/css-to-react-native)! Imagine how you'd write the property in ReactNative, guess how you'd transfer it to CSS and you're probably right:

```JS
const RotatedBox = styled.View`
  transform: rotate(90deg);
  text-shadow-offset: 10 5;
  font-variant: small-caps;
  margin: 5 7 2;
`
```

> You cannot use the `keyframes` and `injectGlobal` helpers since ReactNative doesn't support keyframes or global styles. We will also log a warning if you use media queries or nesting in your CSS.

## Animations

To get React Native animations working, you'll want to define all your non-changing styles in the usual way, and then pass your `Animated.Value`s in as style props.

```js
const BaseStyles = styled.View`
  height: 100;
  width: 100;
  background-color: red;
`

class AnimateOpacity extends Component {
  constructor() {
    super()

    this.state = {
      opacity: new Animated.Value(0)
    }
  }

  componentWillMount() {
    Animated.timing(this.state.opacity, {
      toValue: 1,
      duration: 1000,
    }).start()
  }

  render() {
    const { opacity } = this.state;
    // Pass in your animated values here!
    return <BaseStyles style={{ opacity }} />
  }
}
```
