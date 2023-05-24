/**
 * Convenience function for joining strings to form className chains
 */
export function joinStrings(a?: string | null, b?: string | null): string {
  return a && b ? `${a} ${b}` : a || b || '';
}

export function joinStringArray(arr: string[], sep?: string): string {
  if (arr.length === 0) {
    return '';
  }

  let result = arr[0];
  for (let i = 1; i < arr.length; i++) {
    result += sep ? sep + arr[i] : arr[i];
  }
  return result;
}
