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
    WebStyle->>StyleSheet: StyleSheet.registerId(componentId)
    StyleSheet-->>WebStyle: group allocated
    createStyledComponent->>React: React.forwardRef(forwardRefRender)
    createStyledComponent-->>User: StyledComponent

    Note over User,React: 2. COMPONENT RENDER
    User->>React: render StyledComponent
    React->>useImpl: useImpl(component, props, ref)
    useImpl->>StyleSheetManager: useStyleSheetContext()
    StyleSheetManager-->>useImpl: styleSheet, compiler, shouldForwardProp

    Note over useImpl,WebStyle: 3. STYLE PROCESSING
    useImpl->>useImpl: resolveContext(attrs, props, theme)
    useImpl->>WebStyle: flush(context, styleSheet, compiler)

    WebStyle->>WebStyle: flatten(rules, context)
    Note over WebStyle: Process interpolations,<br/>execute functions,<br/>handle nested components

    WebStyle->>WebStyle: hash(CSS string)
    WebStyle->>WebStyle: generateName(hash)
    WebStyle->>WebStyle: compiler(css, className)
    Note over WebStyle: Parse CSS,<br/>apply plugins,<br/>scope to className

    Note over WebStyle,DOM: 4. STYLE INJECTION
    WebStyle->>StyleSheet: insertRules(componentId, className, formattedCSS)
    StyleSheet->>StyleSheet: registerName(componentId, className)
    StyleSheet->>GroupedTag: getTag().insertRules(groupId, rules)
    GroupedTag->>GroupedTag: indexOfGroup(groupId)
    Note over GroupedTag: Calculate insertion index<br/>based on group priority

    GroupedTag->>Tag: insertRule(index, rule)

    alt Browser (CSSOM)
        Tag->>DOM: CSSStyleSheet.insertRule(rule, index)
    else Browser (Text Node)
        Tag->>DOM: styleElement.insertBefore(textNode)
    else Server (Virtual)
        Tag->>Tag: rules.push(rule)
    end

    Tag-->>GroupedTag: success
    GroupedTag-->>StyleSheet: complete
    StyleSheet-->>WebStyle: complete

    WebStyle-->>useImpl: className

    Note over useImpl,DOM: 5. ELEMENT CREATION
    useImpl->>useImpl: buildClassName(foldedIds + styledId + generated + props)
    useImpl->>useImpl: rawElement(type, props, ref)
    Note over useImpl: Bypasses React.createElement<br/>overhead (~60-120x faster)

    alt RSC Mode
        useImpl->>GroupedTag: getGroup() for inheritance chain + keyframes
        useImpl->>useImpl: wrap base CSS in :where() for zero specificity
        useImpl->>useImpl: emit Fragment with inline style tag + element
        Note over useImpl: No precedence attr —<br/>avoids React 19 Float hoisting
    end

    React-->>User: DOM element with injected styles
```
