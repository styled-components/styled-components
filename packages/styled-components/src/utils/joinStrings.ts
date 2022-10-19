/**
 * Convenience function for joining strings to form className chains
 */
export default function joinStrings(...args: any[]): string {
  return args.filter(Boolean).join(' ');
}
