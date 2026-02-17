// Test: does module augmentation actually populate DefaultTheme with typed properties?
import { DefaultTheme } from 'styled-components';

function testAugmentation(theme: DefaultTheme) {
  // These should be typed from the augmentation in app/types/styled.d.ts
  const primary: string = theme.colors.primary;
  const small: string = theme.spacing.small;
  const fontFamily: string = theme.typography.fontFamily;

  // This should error - 'nonexistent' doesn't exist on Theme
  // @ts-expect-error
  const bad = theme.nonexistent;

  return { primary, small, fontFamily, bad };
}
