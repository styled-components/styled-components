// @flow

export default function isClass(target: any) {
  return typeof target === 'function' && /^\s*class\s+/.test(target.toString())
}
