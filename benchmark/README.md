# Benchmark

Benchmarks performance for both browser and native styled-components.

To benchmark,

```bash
npm install
npm start
```

## Adding a Test

Under `tests`, there are files for each platform we test: currently browser and native. Each platform test file has a default export of an object whose keys are the test names and values are test functions.

```js
export default {
  'test name': () => {
    /* Test function body */
  }
}
```

Tests are usually formed by creating a component, and running it through `react-test-renderer`.

```js
const Component = styled.div`
  color: ${props => props.color};
`;

const instance = render(<Component color="black" />);
instance.update(<Component color="red" />);
```

All tests are compiled using webpack. React uses production-mode optimisations, and the output is minified.

Tests are benchmarked using Benchmark.js, so are run multiple times. If your test uses a global cache, you should clear the cache before running it.
