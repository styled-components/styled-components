import 'styled-components';
import type { ThemeInterface } from './test-augmentation-typeof';

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends ThemeInterface {}
}
