# Performance Refactoring Opportunities

## Current Performance Gap (Production Mode)

| Benchmark | styled-components | Emotion | Gap |
|-----------|------------------|---------|-----|
| Deep Tree | 3.60ms | 2.22ms | +62% |
| Wide Tree | 17.49ms | 11.65ms | +50% |
| Triangle | 12.31ms | 4.45ms | +177% |

## Root Causes Analysis

### 1. Component Creation Overhead (10-30x slower than Emotion)

**Current flow:**
```
styled.div`...` 
  → css() 
    → interleave() 
    → flatten() ← expensive, creates arrays
  → createStyledComponent()
    → generateId() ← hash computation
    → new ComponentStyle()
    → React.forwardRef()
    → Object.defineProperty()
    → hoist() (for composite components)
```

**Emotion's flow:**
```
styled.div`...`
  → store styles array as-is (no processing)
  → create component function
  → done
```

**Opportunity:** Defer `flatten()` entirely to render time. Store raw template strings + interpolations.

### 2. Per-Render Context Overhead

**Current:** 2 useContext calls per render
- `React.useContext(ThemeContext)`
- `React.useContext(StyleSheetContext)`

**Emotion:** Uses `withEmotionCache` HOC that passes cache as render prop, avoiding repeated context lookups for nested components.

**Opportunity:** Cache context at tree root, pass via closure or render prop pattern.

### 3. Multi-Pass Style Processing

**Current flow per render:**
```
generateAndInjectStyles()
  → for each rule part:
      → flatten(partRule) ← creates new array
      → joinStringArray() ← string concatenation  
      → phash() ← hash computation
  → generateName()
  → stylis() ← CSS processing
  → insertRules()
```

**Emotion's flow:**
```
serializeStyles() ← single optimized function
  → returns { name, styles, next }
  → cached by reference
```

**Opportunity:** Single-pass serialization with better caching.

---

## Proposed Refactors

### Refactor 1: Lazy Style Compilation (High Impact)

**Goal:** Don't process styles at component creation time.

**Changes:**
1. Store raw `TemplateStringsArray` + interpolations on ComponentStyle
2. Move `flatten()` call from `css()` to `generateAndInjectStyles()`
3. Cache flattened results by execution context hash

**Before:**
```typescript
// css.ts - called at component creation
function css(styles, ...interpolations) {
  return addTag(flatten(interleave(styles, interpolations)));
}
```

**After:**
```typescript
// css.ts - just store references
function css(styles, ...interpolations) {
  return { strings: styles, interpolations, isCss: true };
}

// ComponentStyle.ts - process at render time
generateAndInjectStyles(context) {
  const rules = this.compiledRules ?? (this.compiledRules = 
    flatten(interleave(this.rawStyles.strings, this.rawStyles.interpolations), context));
  // ... rest of processing
}
```

**Impact:** 5-10x faster component creation
**Risk:** Low - internal change only

---

### Refactor 2: Compiled Style Functions (High Impact)

**Goal:** Pre-compile interpolation functions into optimized accessors.

**Current:**
```typescript
styled.div`margin: ${props => props.m}px;`
// At render: flatten() walks array, calls function, joins strings
```

**Proposed:**
```typescript
// At creation time, analyze and compile:
const compiled = {
  static: 'margin: ',
  dynamic: [(ctx) => ctx.m],
  suffix: 'px;'
};

// At render time, single pass:
let css = compiled.static;
for (const fn of compiled.dynamic) {
  css += fn(context);
}
css += compiled.suffix;
```

**Impact:** 2-3x faster style generation
**Risk:** Medium - changes internal representation

---

### Refactor 3: Context Elimination for Default Case (Medium Impact)

**Goal:** Skip useContext when using default stylesheet.

**Current:**
```typescript
function useStyledComponentImpl() {
  const ssc = useStyleSheetContext(); // Always calls useContext
  // ...
}
```

**Proposed:**
```typescript
// Module-level flag set by StyleSheetManager
let customSheetActive = false;
const defaultSheet = { styleSheet: mainSheet, stylis: mainStylis };

function useStyleSheetContext() {
  // Fast path: no custom sheet
  if (!customSheetActive) return defaultSheet;
  return React.useContext(StyleSheetContext);
}
```

**Impact:** ~15% faster when not using StyleSheetManager
**Risk:** Low - behavioral equivalent

---

### Refactor 4: Monomorphic Component Factory (Medium Impact)

**Goal:** Create components with consistent hidden class shape.

**Current:** Each styled component has slightly different property assignments, causing V8 to create new hidden classes.

**Proposed:**
```typescript
class StyledComponent {
  static create(tag, options, rules) {
    const instance = new StyledComponent();
    instance.tag = tag;
    instance.rules = rules;
    instance.componentId = generateId();
    // ... all properties assigned in consistent order
    return instance.render.bind(instance);
  }
  
  render(props, ref) {
    // ... render logic
  }
}
```

**Impact:** 10-20% faster due to V8 optimization
**Risk:** Medium - changes component structure

---

### Refactor 5: Streaming Hash Computation (Low-Medium Impact)

**Goal:** Compute hash incrementally as CSS is built.

**Current:**
```typescript
// Build full CSS string first
let css = '';
for (part of rules) {
  css += flatten(part).join('');
}
// Then hash it
const name = generateName(hash(css));
```

**Proposed:**
```typescript
// Hash as we go
let h = SEED;
for (part of rules) {
  const str = processPartToString(part);
  h = phash(h, str);
  // Append to output
}
const name = generateName(h);
```

**Impact:** ~10% faster, less memory allocation
**Risk:** Low - internal change

---

### Refactor 6: Skip forwardRef for Simple Cases (Medium Impact)

**Goal:** Use plain function components when ref forwarding isn't needed.

**Current:** Always wrap with `React.forwardRef()`.

**Proposed:**
```typescript
// For string tags (div, span, etc.), refs work automatically in React 19
if (typeof tag === 'string' && reactVersion >= 19) {
  return function StyledComponent(props) {
    return useStyledComponentImpl(this, props, props.ref);
  };
}
// Fallback to forwardRef for composite components
return React.forwardRef(forwardRefRender);
```

**Impact:** ~5% faster component creation
**Risk:** Low - React 19+ only optimization

---

## Implementation Priority

| Refactor | Impact | Risk | Effort |
|----------|--------|------|--------|
| 1. Lazy Style Compilation | High | Low | Medium |
| 2. Compiled Style Functions | High | Medium | High |
| 3. Context Elimination | Medium | Low | Low |
| 4. Monomorphic Factory | Medium | Medium | Medium |
| 5. Streaming Hash | Low-Med | Low | Low |
| 6. Skip forwardRef | Medium | Low | Low |

**Recommended order:** 3 → 5 → 1 → 6 → 4 → 2

---

## Target Performance

With all refactors implemented:

| Benchmark | Current | Target | vs Emotion |
|-----------|---------|--------|------------|
| Deep Tree | 3.60ms | ~2.5ms | +12% |
| Wide Tree | 17.49ms | ~12ms | +3% |
| Triangle | 12.31ms | ~5-6ms | +20-35% |

The Triangle benchmark (many unique dynamic styles) will remain slower than Emotion because of architectural differences in how styles are cached and inserted. Emotion uses a linked-list cache structure that's optimized for this case.
