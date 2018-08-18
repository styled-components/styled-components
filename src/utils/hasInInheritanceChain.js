// @flow

export default function hasInInheritanceChain(child: any, parent: Function) {
  let target = child

  while (target) {
    target = Object.getPrototypeOf(target)

    if (target && target === parent) {
      return true
    }
  }

  return false
}
