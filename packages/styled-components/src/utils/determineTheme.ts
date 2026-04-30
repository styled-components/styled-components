import type { DefaultTheme, ExecutionProps } from '../types';

export default function determineTheme(
  props: ExecutionProps,
  providedTheme?: DefaultTheme | undefined
): DefaultTheme | undefined {
  return props.theme || providedTheme;
}
