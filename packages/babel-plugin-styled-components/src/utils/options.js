function getOption({ opts }, name, defaultValue = true) {
  return opts[name] === undefined || opts[name] === null ? defaultValue : opts[name]
}

export const useDisplayName = (state) => getOption(state, 'displayName')
export const useSSR = (state) =>  getOption(state, 'ssr')
export const useFileName = (state) =>getOption(state, 'fileName')
export const useMinify = (state) => getOption(state, 'minify')
