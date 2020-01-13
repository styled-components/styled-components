# benchmarks

Try the [benchmarks app](https://necolas.github.io/react-native-web/benchmarks) online.

To run the benchmarks locally:

```
yarn benchmarks
open ./packages/benchmarks/dist/index.html
```

Develop against these benchmarks:

```
yarn compile --watch
yarn benchmarks --watch
```

## Notes

These benchmarks are approximations of extreme cases that libraries may
encounter. Their purpose is to provide an early-warning signal for performance
regressions. Each test report includes the mean and standard deviation of the
timings, and approximations of the time spent in scripting (S) and layout (L).

The components used in the render benchmarks are simple enough to be
implemented by multiple UI or style libraries. The benchmark implementations
and the features of the style libraries are _only approximately equivalent in
functionality_.

No benchmark will run for more than 20 seconds.

### Mount deep/wide tree

These cases look at the performance of mounting and rendering large trees of
elements that use static styles.

### Update dynamic styles

This case looks at the performance of repeated style updates to a large mounted
tree. Some libraries choose to inject new styles for each "dynamic style",
whereas others choose to use inline styles. Libraries without built-in support
for dynamic styles (i.e., they rely on user-authored inline styles) are not
included.

## Example results

### MacBook Pro (2011)

MacBook Pro (13-inch, Early 2011); 2.3 GHz Intel Core i5; 8 GB 1333 MHz DDR3 RAM. Google Chrome 63.

Typical render timings: mean ± standard deviations.

| Implementation                        | Mount deep tree (ms) | Mount wide tree (ms) | Dynamic update (ms) |
| :--- | ---: | ---: | ---: |
| `css-modules`                         |     `30.19` `±04.84` |     `38.25` `±04.85` |                   - |
| `react-native-web@0.4.0`              |     `36.40` `±04.98` |     `51.28` `±05.58` |    `19.36` `±02.56` |
| `inline-styles`                       |     `64.12` `±07.69` |     `94.49` `±11.34` |    `09.84` `±02.36` |

### Moto G4

Moto G4 (Android 7); Octa-core (4x1.5 GHz & 4x1.2 Ghz); 2 GB RAM. Google Chrome 63.

Typical render timings: mean ± standard deviations.

| Implementation                        | Mount deep tree (ms) | Mount wide tree (ms) | Dynamic update (ms) |
| :--- | ---: | ---: | ---: |
| `css-modules`                         |     `98.24` `±20.26` |    `143.75` `±25.50` |                   - |
| `react-native-web@0.4.0`              |    `131.46` `±18.96` |    `174.70` `±14.88` |    `60.87` `±06.32` |
| `inline-styles`                       |    `184.58` `±26.23` |    `273.86` `±26.23` |    `30.28` `±07.44` |
