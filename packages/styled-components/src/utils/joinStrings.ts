/**
 * Convenience function for joining strings to form className chains
 */
export function joinStrings(a?: string | undefined, b?: string | undefined): string {
  return a && b ? `${a} ${b}` : a || b || '';
}

export function joinStringArray(arr: string[], sep?: string | undefined): string {
  return arr.join(sep || '');
}
