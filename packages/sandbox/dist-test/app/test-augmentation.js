function testAugmentation(theme) {
    // These should be typed from the augmentation in app/types/styled.d.ts
    const primary = theme.colors.primary;
    const small = theme.spacing.small;
    const fontFamily = theme.typography.fontFamily;
    // This should error - 'nonexistent' doesn't exist on Theme
    // @ts-expect-error
    const bad = theme.nonexistent;
    return { primary, small, fontFamily, bad };
}
export {};
