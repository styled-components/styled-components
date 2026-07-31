# Rendering Flow

Update this diagram as the library is edited.

```mermaid
sequenceDiagram
    participant User
    participant styled
    participant createStyledComponent
    participant WebStyle
    participant React
    participant useImpl
    participant StyleSheetManager
    participant StyleSheet
    participant GroupedTag
    participant Tag
    participant DOM

    Note over User,styled: 1. COMPONENT CREATION
    User->>styled: styled.div with CSS rules
    styled->>createStyledComponent: createStyledComponent(target, options, rules)
    createStyledComponent->>WebStyle: new WebStyle(rules, componentId)
    WebStyle->>WebStyle: synthesizeSourceForRuleSet (parse + AST built once)
    WebStyle->>StyleSheet: StyleSheet.registerId(componentId)
    StyleSheet-->>WebStyle: group allocated
    createStyledComponent-->>User: StyledComponent

    Note over User,React: 2. COMPONENT RENDER
    User->>React: render StyledComponent
    React->>useImpl: useImpl(component, props, ref)
    useImpl->>StyleSheetManager: useStyleSheetContext()
    StyleSheetManager-->>useImpl: styleSheet, compiler, shouldForwardProp

    Note over useImpl,WebStyle: 3. STYLE PROCESSING (render)
    useImpl->>useImpl: render-cache check (fast skip on shallow-equal props/theme)
    useImpl->>useImpl: resolveContext(attrs, props, theme)
    useImpl->>WebStyle: generate(context, styleSheet, compiler)
    WebStyle->>WebStyle: evaluateForFastPath (fill sentinels in pre-built AST)
    WebStyle->>WebStyle: buildInterpKey -> interpKeyCache lookup
    WebStyle->>StyleSheet: claimNameForId (turn-scoped; stash rules for siblings)
    Note over WebStyle: Cache hit returns prior class name<br/>without re-emitting CSS

    alt cache miss
        WebStyle->>WebStyle: buildHashCSS (joined string for hash)
        WebStyle->>WebStyle: cssKeyCache lookup
        WebStyle->>WebStyle: generateName(phash(baseHash, hash, css))
        WebStyle->>WebStyle: compiler.emit (AST-direct)
    end

    WebStyle-->>useImpl: GeneratedStyle (className + rules)

    Note over useImpl,DOM: 4. STYLE INJECTION
    alt Browser client (buffered)
        useImpl->>useImpl: mount StyleInjector when rules are unwritten
        Note over useImpl,React: commit: useInsertionEffect
        useImpl->>WebStyle: inject(styleSheet, generated)
        WebStyle->>StyleSheet: insertRules (hasNameForId dedupes)
        StyleSheet->>GroupedTag: getTag().insertRules(groupId, rules)
        GroupedTag->>Tag: insertRule(index, rule)
        Tag->>DOM: CSSStyleSheet.insertRule(rule, index)
    else ServerStyleSheet / sync server path
        useImpl->>WebStyle: flush (generate + inject in one call)
        WebStyle->>StyleSheet: insertRules
        StyleSheet->>Tag: rules.push(rule)
    else RSC Mode
        useImpl->>useImpl: rscFlush + emit Fragment with inline style tag
        Note over useImpl: No precedence attr,<br/>avoids React 19 Float hoisting
    end

    Note over useImpl,DOM: 5. ELEMENT CREATION
    useImpl->>useImpl: buildClassName(foldedIds + styledId + generated + props)
    useImpl->>useImpl: createElement(type, props)
    React-->>User: DOM element with injected styles
```
