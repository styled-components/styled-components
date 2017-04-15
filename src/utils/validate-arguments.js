// @flow

const generateInvalidFunctionError = (func) => (
`Error: ${func} is called as a function.
It seems like ${func} is called as '${func}(\`css\`)', it is supposed to be called as '${func}\`css\`'`
)

export default function validateArguments(func: string) {
  return (strings: Array<string>) => {
    if (!Array.isArray(strings)) {
      // func is called with func(``) instead of func``
      console.error(generateInvalidFunctionError(func))
    }
  }
}
