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

### Refactor 3: Context Elimination for Default Case (Medium Impact) ✅ IMPLEMENTED

**Goal:** Skip useContext when using default stylesheet/theme.

**Status:** Implemented in `src/models/StyleSheetManager.tsx` and `src/models/ThemeProvider.tsx`

**Implementation:**
- Added `styleSheetManagerActive` flag in StyleSheetManager
- Added `themeProviderActive` flag in ThemeProvider
- `useStyleSheetContext()` returns default value if no StyleSheetManager has been used
- `useContextTheme()` returns undefined if no ThemeProvider has been used
- Reduces useContext calls from 2 per render to 0 when using defaults

**Before:** 2 useContext calls per styled component render
**After:** 0 useContext calls when no StyleSheetManager/ThemeProvider used

**Impact:** Eliminates React context overhead for default case
**Risk:** Low - "once active, always active" flag ensures correctness

---

### Refactor 4: Monomorphic Component Factory (Medium Impact)

**Goal:** Create components with consistent hidden class shape.

**Status:** Investigated - minimal additional benefit

**Analysis:**
- Property assignments reordered for consistency
- Workspace is already ~5-10% faster than V6 at component creation (from forwardRef optimization)
- Full monomorphic factory would require converting styled components to class instances
- V8 already optimizes the current function-with-properties pattern well
- Risk/reward ratio not favorable for full implementation

**Impact:** Already achieved ~10% faster via forwardRef optimization
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

### Refactor 6: Skip forwardRef for Simple Cases (Medium Impact) ✅ IMPLEMENTED

**Goal:** Use plain function components when ref forwarding isn't needed.

**Status:** Implemented in `src/constants.ts` and `src/models/StyledComponent.ts`

**Implementation:**
- Added `SUPPORTS_REF_AS_PROP` constant that detects React 19+ via version parsing
- For React 19+ with string tags (div, span, etc.): use plain function component
- For React 16-18 or composite components: use `React.forwardRef()` (backward compatible)

**Impact:** ~5% faster component creation in React 19+
**Risk:** Low - React 19+ only optimization, no change for older React versions

---

## Implementation Priority

| Refactor | Impact | Risk | Effort | Status |
|----------|--------|------|--------|--------|
| 1. Lazy Style Compilation | High | Low | Medium | Tested - adds overhead for SSR |
| 2. Compiled Style Functions | High | Medium | High | Pending |
| 3. Context Elimination | Medium | Low | Low | ✅ Done |
| 4. Monomorphic Factory | Medium | Medium | Medium | Investigated - minimal additional benefit |
| 5. Streaming Hash | Low-Med | Low | Low | Tested - no significant benefit |
| 6. Skip forwardRef | Medium | Low | Low | ✅ Done |

**Remaining:** Refactor 2 (Compiled Style Functions) - requires significant architectural changes

Note: Refactor 1 (Lazy Style Compilation) was tested but found to add overhead for SSR since the work is still done, just deferred. It would only help client-side scenarios where components are created but not rendered.

---

## Target Performance

With all refactors implemented:

| Benchmark | Current | Target | vs Emotion |
|-----------|---------|--------|------------|
| Deep Tree | 3.60ms | ~2.5ms | +12% |
| Wide Tree | 17.49ms | ~12ms | +3% |
| Triangle | 12.31ms | ~5-6ms | +20-35% |

The Triangle benchmark (many unique dynamic styles) will remain slower than Emotion because of architectural differences in how styles are cached and inserted. Emotion uses a linked-list cache structure that's optimized for this case.
