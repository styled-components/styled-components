// @flow
import invariant from 'invariant'

const generateInvalidFunctionError = (func) => (
`It seems like ${func} is called as '${func}(\`css\`)', it is supposed to be called as '${func}\`css\`'`
)

export default function validateArguments(func: string) {
  return (strings: Array<string>) => {
    invariant(Array.isArray(strings), generateInvalidFunctionError(func))
  }
}
