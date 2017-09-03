/* Styled Components top level default configuration.
 *
 * Allows for some settings to be overridden before SC is
 * loaded. I.e. you must import 'styled-components/config'
 * BEFORE importing 'styled-components'
 *
 * For more information, see [DOCUMENTATION URL]
 */

var config = {
  prefix_css: true,
}

var config_already_read = false
exports.configure = function configure(overrides) {
  if (config_already_read) throw new Error("Can only configure Styled Components before you've used it!")
  var new_configuration = typeof overrides === 'function' ? overrides(config) : overrides
  Object.keys(new_configuration).forEach(key => config[key] = new_configuration[key])
}

exports.getConfiguration = function getConfiguration() {
  config_already_read = true
  return config
}
