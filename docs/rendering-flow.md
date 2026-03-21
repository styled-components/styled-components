# Rendering Flow

Update this diagram as the library is edited.

```mermaid
sequenceDiagram
    participant User
    participant styled
    participant createStyledComponent
    participant ComponentStyle
    participant React
    participant StyledComponentImpl
    participant StyleSheetManager
    participant StyleSheet
    participant GroupedTag
    participant Tag
    participant DOM

    Note over User,styled: 1. COMPONENT CREATION
    User->>styled: styled.div with CSS rules
    styled->>createStyledComponent: createStyledComponent(target, options, rules)
    createStyledComponent->>ComponentStyle: new ComponentStyle(rules, componentId)
    ComponentStyle->>StyleSheet: StyleSheet.registerId(componentId)
    StyleSheet-->>ComponentStyle: group allocated
    createStyledComponent->>React: React.forwardRef(forwardRefRender)
    createStyledComponent-->>User: StyledComponent

    Note over User,React: 2. COMPONENT RENDER
    User->>React: render StyledComponent
    React->>StyledComponentImpl: useStyledComponentImpl(component, props, ref)
    StyledComponentImpl->>StyleSheetManager: useStyleSheetContext()
    StyleSheetManager-->>StyledComponentImpl: styleSheet, stylis, shouldForwardProp

    Note over StyledComponentImpl,ComponentStyle: 3. STYLE PROCESSING
    StyledComponentImpl->>StyledComponentImpl: resolveContext(attrs, props, theme)
    StyledComponentImpl->>ComponentStyle: generateAndInjectStyles(context, styleSheet, stylis)

    ComponentStyle->>ComponentStyle: flatten(rules, context)
    Note over ComponentStyle: Process interpolations,<br/>execute functions,<br/>handle nested components

    ComponentStyle->>ComponentStyle: hash(CSS string)
    ComponentStyle->>ComponentStyle: generateName(hash)
    ComponentStyle->>ComponentStyle: stylis(css, className)
    Note over ComponentStyle: Parse & prefix CSS,<br/>apply plugins,<br/>scope to className

    Note over ComponentStyle,DOM: 4. STYLE INJECTION
    ComponentStyle->>StyleSheet: insertRules(componentId, className, formattedCSS)
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
    StyleSheet-->>ComponentStyle: complete

    ComponentStyle-->>StyledComponentImpl: className

    Note over StyledComponentImpl,DOM: 5. ELEMENT CREATION
    StyledComponentImpl->>StyledComponentImpl: buildClassName(foldedIds + styledId + generated + props)
    StyledComponentImpl->>StyledComponentImpl: rawElement(type, props, ref)
    Note over StyledComponentImpl: Bypasses React.createElement<br/>overhead (~60-120x faster)

    alt RSC Mode
        StyledComponentImpl->>GroupedTag: getGroup() for inheritance chain + keyframes
        StyledComponentImpl->>StyledComponentImpl: wrap base CSS in :where() for zero specificity
        StyledComponentImpl->>StyledComponentImpl: emit Fragment with inline style tag + element
        Note over StyledComponentImpl: No precedence attr —<br/>avoids React 19 Float hoisting
    end

    React-->>User: DOM element with injected styles
```
