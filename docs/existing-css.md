# Using `styled-components` with existing CSS

`styled-components` generate an actual stylesheet with classes, and attaches those classes to the DOM nodes of styled components via the `className` prop. It injects the generated stylesheet at the end of the HEAD of the document.

## Styling normal React components

If you use the `styled(MyNormalComponent)` notation and `MyNormalComponent` does not render the passed-in `className` prop the styles will **not** be applied.

To avoid this issue, make sure your component (in this case `MyNormalComponent`) attaches the passed-in `className` to a DOM node:

```JSX
class MyNormalComponent extends React.Component {
  render() {
    return (
      // Attach the passed-in className to the DOM node
      <div className={this.props.className}></div>
    );
  }
}
```

If you have pre-existing styles with a class, you can combine the global class with the `styled-components` one:

```JSX
class MyNormalComponent extends React.Component {
  render() {
    return (
      // Use a global class with existing styling in combination with
      // allowing this component to be styled with styled-components
      <div className={`some-global-class ${this.props.className}`}></div>
    );
  }
}
```

## Global class always overridden

You can apply a global CSS class to a styled component by adding a `className` prop. This will work, but if a specific CSS property (e.g. `background-color`) is defined in both the global CSS _and_ the styled component the results may not be what your expecting!

A contrived example:

```JS
// MyComponent.js
const MyComponent = styled.div`background-color: green;`;
```

```CSS
/* my-component.css */
.red-bg {
  background-color: red;
}
```

```JSX
// For some reason this component still has a green background,
// even though you're trying to override it with the "red-bg" class!
<MyComponent className="red-bg" />
```

This is because `styled-components` injects the stylesheet at the end of the HEAD. If the CSS class you wrote is before the injected styles in the DOM, because of the cascade, the last styles targeting the same element (in this case the `styled-components` ones) will win!

You can easily fix this by moving your CSS class to the beginning of the body in the DOM.

Sadly, some tools (like the webpack `style-loader`) give you no control over the place they inject the CSS into, meaning you cannot move them after the `styled-components` one.

The easy fix for that is bumping up the specificity of the CSS class you're overriding with, by writing it twice:

```CSS
/* my-component.css */
.red-bg.red-bg {
  background-color: red;
}
```
