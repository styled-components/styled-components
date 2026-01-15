# Styled-Components Optimization Exploration

## Executive Summary

After thorough analysis of the codebase from performance and bundle size perspectives, I've identified **5 big rocks** that represent significant optimization opportunities. Each addresses either runtime performance, bundle size reduction, or both.

---

## Big Rock #1: GroupedTag.indexOfGroup() - O(n) to O(1) Complexity

### Current Implementation

```typescript
// sheet/GroupedTag.ts:23-29
indexOfGroup(group: number) {
  let index = 0;
  for (let i = 0; i < group; i++) {
    index += this.groupSizes[i];
  }
  return index;
}
```

### Problem

This function is called on **every style insertion** (`insertRules`) and **every group retrieval** (`getGroup`). For applications with many styled-components (common in large apps with 500+ components), this becomes a significant bottleneck:

- Time complexity: **O(n)** where n = number of component groups
- Called multiple times per render: once for insertion index calculation, again for any SSR output
- As applications grow, performance degrades linearly

### Proposed Solution

Maintain a **cumulative prefix sum array** alongside `groupSizes`:

```typescript
class DefaultGroupedTag implements GroupedTag {
  groupSizes: Uint32Array;
  groupOffsets: Uint32Array; // NEW: cumulative offsets
  length: number;
  tag: Tag;

  constructor(tag: Tag) {
    this.groupSizes = new Uint32Array(BASE_SIZE);
    this.groupOffsets = new Uint32Array(BASE_SIZE); // NEW
    this.length = BASE_SIZE;
    this.tag = tag;
  }

  // O(1) lookup
  indexOfGroup(group: number) {
    return group === 0 ? 0 : this.groupOffsets[group - 1];
  }

  insertRules(group: number, rules: string[]) {
    // ... existing resize logic ...
    
    const insertCount = /* rules actually inserted */;
    
    // Update prefix sums from this group onward - O(k) where k = groups after this one
    // But this is still better than O(n) on every read
    for (let i = group; i < this.length; i++) {
      this.groupOffsets[i] += insertCount;
    }
  }
}
```

### Impact Estimate

- **Performance**: 10-50x faster for `indexOfGroup()` calls in large applications
- **Memory**: ~4 bytes per component (negligible)
- **Bundle Size**: +50-100 bytes

### Do's
- Benchmark with realistic app sizes (100, 500, 1000+ components)
- Ensure the prefix sum update in `insertRules` doesn't negate gains
- Consider lazy initialization of `groupOffsets`

### Don'ts
- Don't add complexity if typical apps have <50 components
- Don't change the public API

---

## Big Rock #2: Flatten Function Optimization - Reduce Allocations

### Current Implementation

```typescript
// utils/flatten.ts:107-114
export default function flatten<Props extends object>(
  chunk: Interpolation<object>,
  // ...
): RuleSet<Props> {
  // ... various type checks ...
  
  return flatMap(chunk, chunklet =>
    flatten<Props>(chunklet, executionContext, styleSheet, stylisInstance)
  );
}

function flatMap<T, U>(array: T[], transform: (value: T) => U[]): U[] {
  return Array.prototype.concat.apply(EMPTY_ARRAY, array.map(transform));
}
```

### Problems

1. **Recursive allocations**: Every `flatten()` call potentially allocates new arrays
2. **`flatMap` uses `Array.prototype.concat.apply`**: Creates intermediate arrays
3. **`array.map(transform)`**: Creates another intermediate array before concat
4. **Called on every render** for dynamic styles

### Proposed Solution

Use an imperative, single-pass approach with a pre-allocated or reusable buffer:

```typescript
export default function flatten<Props extends object>(
  chunk: Interpolation<object>,
  executionContext?: (ExecutionContext & Props) | undefined,
  styleSheet?: StyleSheet | undefined,
  stylisInstance?: Stringifier | undefined
): RuleSet<Props> {
  const result: RuleSet<Props> = [];
  flattenInto(chunk, result, executionContext, styleSheet, stylisInstance);
  return result;
}

function flattenInto<Props extends object>(
  chunk: Interpolation<object>,
  result: RuleSet<Props>,
  executionContext?: (ExecutionContext & Props) | undefined,
  styleSheet?: StyleSheet | undefined,
  stylisInstance?: Stringifier | undefined
): void {
  if (isFalsish(chunk)) return;
  
  if (isStyledComponent(chunk)) {
    result.push(`.${(chunk as unknown as IStyledComponent<'web', any>).styledComponentId}`);
    return;
  }
  
  if (isFunction(chunk)) {
    if (isStatelessFunction(chunk) && executionContext) {
      flattenInto(chunk(executionContext), result, executionContext, styleSheet, stylisInstance);
    } else {
      result.push(chunk as unknown as IStyledComponent<'web'>);
    }
    return;
  }
  
  if (chunk instanceof Keyframes) {
    if (styleSheet) {
      chunk.inject(styleSheet, stylisInstance);
      result.push(chunk.getName(stylisInstance));
    } else {
      result.push(chunk);
    }
    return;
  }
  
  if (isPlainObject(chunk)) {
    objToCssArrayInto(chunk as StyledObject<Props>, result);
    return;
  }
  
  if (!Array.isArray(chunk)) {
    result.push(chunk.toString());
    return;
  }
  
  // Array case - iterate and flatten each element
  for (let i = 0; i < chunk.length; i++) {
    flattenInto(chunk[i], result, executionContext, styleSheet, stylisInstance);
  }
}
```

### Impact Estimate

- **Performance**: 2-5x faster flatten operations, significantly reduced GC pressure
- **Memory**: 50-80% fewer intermediate array allocations per render
- **Bundle Size**: Neutral or slightly larger (+100-200 bytes)

### Do's
- Microbenchmark with complex nested interpolations
- Ensure the same output for all edge cases
- Test with real-world styled-components patterns

### Don'ts
- Don't mutate shared state
- Don't break the `isCss` tagging behavior

---

## Big Rock #3: Consolidate @emotion Dependencies - Bundle Size Reduction

### Current Dependencies

```json
{
  "@emotion/is-prop-valid": "1.4.0",
  "@emotion/unitless": "0.10.0"
}
```

### Problems

1. **Two separate packages** for small functionality
2. **`is-prop-valid` is ~800 bytes minified+gzipped** but only used for dev warnings
3. **`unitless` is ~300 bytes** for a simple lookup table
4. Both packages ship React-specific logic that may duplicate or conflict

### Analysis

**`@emotion/unitless`** provides a map of CSS properties that don't need units:

```javascript
// From @emotion/unitless
export default {
  animationIterationCount: 1,
  borderImageSlice: 1,
  // ... ~50 properties
}
```

**`@emotion/is-prop-valid`** validates HTML props:

```javascript
// Used only in dev mode for warnings
import isPropValid from '@emotion/is-prop-valid';
// ... in StyledComponent.ts line 159
if (!isPropValid(key) && !seenUnknownProps.has(key)) {
  // warn
}
```

### Proposed Solutions

#### Option A: Inline unitless (recommended)

Create a local `unitlessProperties.ts` that contains only the properties we need:

```typescript
// utils/unitlessProperties.ts
const unitless: Record<string, 1> = {
  animationIterationCount: 1,
  borderImageSlice: 1,
  borderImageWidth: 1,
  // ... include all from @emotion/unitless
};

export default unitless;
```

**Savings**: ~300 bytes + eliminates dependency

#### Option B: Make is-prop-valid optional/lazy

Move `is-prop-valid` to a peer dependency or make it conditional:

```typescript
// StyledComponent.ts
let isPropValid: ((prop: string) => boolean) | undefined;
try {
  isPropValid = require('@emotion/is-prop-valid').default;
} catch {
  // Optional dependency not installed
}

// In dev warning:
if (process.env.NODE_ENV === 'development' && isPropValid && !isPropValid(key)) {
  // warn
}
```

**Savings**: ~800 bytes in production (tree-shaking removes dev-only code)

### Impact Estimate

- **Bundle Size**: -1KB to -1.5KB minified+gzipped
- **Performance**: Marginal improvement from fewer module initializations
- **Breaking Change Risk**: Low (these are implementation details)

### Do's
- Verify the unitless list is complete
- Keep the dev warning functionality intact
- Add inline comments about the source

### Don'ts
- Don't break compatibility with SSR/RSC
- Don't remove functionality, just internalize it

---

## Big Rock #4: Hash Function Optimization - SIMD-Friendly Implementation

### Current Implementation

```typescript
// utils/hash.ts
export const SEED = 5381;

export const phash = (h: number, x: string) => {
  let i = x.length;
  while (i) {
    h = (h * 33) ^ x.charCodeAt(--i);
  }
  return h;
};

export const hash = (x: string) => {
  return phash(SEED, x);
};
```

### Problems

1. **Right-to-left iteration**: Prevents compiler optimizations
2. **Per-character `charCodeAt` calls**: Could be batched
3. **djb2 is simple but not optimal**: Modern alternatives exist
4. **Called on every dynamic style**: This is a hot path

### Proposed Solution

Use a forward-iterating implementation with unrolled loops:

```typescript
export const phash = (h: number, x: string) => {
  const len = x.length;
  let i = 0;
  
  // Process 4 characters at a time
  for (; i + 3 < len; i += 4) {
    h = ((h * 33) ^ x.charCodeAt(i));
    h = ((h * 33) ^ x.charCodeAt(i + 1));
    h = ((h * 33) ^ x.charCodeAt(i + 2));
    h = ((h * 33) ^ x.charCodeAt(i + 3));
  }
  
  // Handle remaining characters
  for (; i < len; i++) {
    h = ((h * 33) ^ x.charCodeAt(i));
  }
  
  return h;
};
```

### Alternative: FNV-1a (Better Distribution)

```typescript
const FNV_PRIME = 0x01000193;
const FNV_OFFSET = 0x811c9dc5;

export const fnv1a = (str: string): number => {
  let hash = FNV_OFFSET;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
};
```

### Impact Estimate

- **Performance**: 15-40% faster hashing for typical CSS strings (50-500 chars)
- **Bundle Size**: +50-100 bytes
- **Risk**: Hash changes would break hydration if not handled carefully

### Do's
- Microbenchmark with real CSS strings of various lengths
- Ensure hash distribution remains good
- Consider hash stability for SSR/hydration

### Don'ts
- Don't change hash output in a minor version (breaking change)
- Don't over-optimize for very short strings at expense of long ones

---

## Big Rock #5: Stylis Integration Optimization - Reduce Regex and String Operations

### Current Implementation

```typescript
// utils/stylis.ts
const AMP_REGEX = /&/g;

const selfReferenceReplacementPlugin: stylis.Middleware = element => {
  if (element.type === stylis.RULESET && element.value.includes('&')) {
    (element.props as string[])[0] = element.props[0]
      .replace(AMP_REGEX, _selector)
      .replace(_selectorRegexp, selfReferenceReplacer);
  }
};

const stringifyRules: Stringifier = (css, selector, prefix, componentId) => {
  _componentId = componentId;
  _selector = selector;
  _selectorRegexp = new RegExp(`\\${_selector}\\b`, 'g'); // NEW REGEX EVERY CALL
  
  const flatCSS = sanitizeCSS(stripLineComments(css));
  // ...
};
```

### Problems

1. **New RegExp created on every call**: `_selectorRegexp` is rebuilt for each `stringifyRules` call
2. **Multiple string passes**: `stripLineComments` → `sanitizeCSS` → `stylis.compile`
3. **`replaceAll` used in namespace code**: Can be expensive for large stylesheets
4. **String concatenation in hot paths**: Creates garbage

### Proposed Solutions

#### Selector Regex Caching

```typescript
const selectorRegexCache = new Map<string, RegExp>();

const getSelectorRegexp = (selector: string): RegExp => {
  let regex = selectorRegexCache.get(selector);
  if (!regex) {
    regex = new RegExp(`\\${selector}\\b`, 'g');
    selectorRegexCache.set(selector, regex);
  }
  return regex;
};
```

#### Single-Pass CSS Preprocessing

Combine `stripLineComments` and `hasUnbalancedBraces` into a single pass:

```typescript
function preprocessCSS(css: string): { result: string; isValid: boolean } {
  // Single pass that:
  // 1. Strips line comments
  // 2. Tracks brace balance
  // 3. Returns early if balanced
}
```

#### Avoid replaceAll in namespace handling

```typescript
// Current:
rule.value = rule.value.replaceAll(',', `,${namespace} `);

// Better:
rule.value = rule.value.split(',').join(`,${namespace} `);

// Or use regex with replacement:
rule.value = rule.value.replace(/,/g, `,${namespace} `);
```

### Impact Estimate

- **Performance**: 10-25% faster style processing
- **Memory**: Reduced string allocations
- **Bundle Size**: Neutral

### Do's
- Limit cache size to prevent memory leaks
- Benchmark with complex selectors (nested, comma-separated)
- Test with RTL plugins and other stylis middleware

### Don'ts
- Don't break stylis plugin compatibility
- Don't change selector output format

---

## Summary Matrix

| Big Rock | Performance Impact | Bundle Size Impact | Implementation Risk | Priority |
|----------|-------------------|-------------------|---------------------|----------|
| #1 GroupedTag O(1) | High (10-50x for indexOfGroup) | +100 bytes | Low | **High** |
| #2 Flatten Optimization | High (2-5x, less GC) | +100-200 bytes | Medium | **High** |
| #3 Consolidate Dependencies | Low | **-1KB to -1.5KB** | Low | **Medium** |
| #4 Hash Optimization | Medium (15-40%) | +50-100 bytes | Low-Medium* | **Medium** |
| #5 Stylis Optimization | Medium (10-25%) | Neutral | Low | **Medium** |

*Hash changes require careful migration strategy

---

## Recommended Implementation Order

1. **#1 GroupedTag O(1)** - Highest impact for large apps, low risk
2. **#2 Flatten Optimization** - High impact, moderate complexity
3. **#3 Consolidate Dependencies** - Easy wins for bundle size
4. **#5 Stylis Optimization** - Medium impact, low risk
5. **#4 Hash Optimization** - Requires versioning strategy due to hydration concerns

---

## Benchmarking Strategy

Before implementing any optimization, establish baselines using:

1. **Existing benchmarks package**: `/packages/benchmarks`
2. **Micro-benchmarks for specific functions**: Use `benchmark.js` or similar
3. **Real-world app simulation**: Create a test with 500+ styled components
4. **Memory profiling**: Use Chrome DevTools or Node's `--inspect` flag

Key metrics to track:
- Time to first styled component render
- Time for dynamic style updates
- Memory pressure (GC frequency)
- Bundle size (minified + gzipped)
