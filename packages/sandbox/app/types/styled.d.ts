import 'styled-components';
import type { Theme } from '../lib/test-themes';

declare module 'styled-components' {
  export interface DefaultTheme extends Theme {}
}
