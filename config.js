/* eslint-disable */
/* Styled Components top level default configuration.
 *
 * Allows for some settings to be overridden before SC is
 * loaded. I.e. you must import 'styled-components/config'
 * BEFORE importing 'styled-components'
 *
 * For more information, see [DOCUMENTATION URL]
 */

const config = {
  prefix_css: true,
}

let config_already_read = false
exports.configure = function configure(overrides) {
  if (config_already_read) throw new Error("Can only configure Styled Components before you've used it!")
  Object.keys(overrides).forEach((key) => {
    config[key] = overrides[key]
  })
}

exports.getConfiguration = function getConfiguration() {
  config_already_read = true
  return config
}
