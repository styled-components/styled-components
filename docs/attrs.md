# attrs Behavior

- attrs ALWAYS wins over directly passed props (by design)
- The function form is the escape hatch: `.attrs(({ as }) => ({ as: as || "button" }))`
- Exception: explicitly passing `undefined` for a prop prevents attrs from overwriting it (PR #5683)
