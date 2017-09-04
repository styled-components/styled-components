/* This loads the configuration (possibly after it has been changed)
 * and exports the current values.
 *
 * It needs to be calling 'require' otherwise Rollup would inline it
 * and the config method wouldn't work.
 */
const config = require('../config')

export default config.getConfiguration()
