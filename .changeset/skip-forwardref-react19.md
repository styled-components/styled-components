---
'styled-components': patch
---

perf: skip forwardRef wrapper for string tags in React 19+

In React 19, refs are passed as regular props to function components, making 
React.forwardRef unnecessary. This change detects React 19+ at runtime and 
uses plain function components for string tags (div, span, etc.), reducing 
component creation overhead.

For React 16-18 and composite components (styled(MyComponent)), the existing 
forwardRef behavior is preserved.
