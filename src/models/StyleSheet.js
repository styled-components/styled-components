// @flow

/* Wraps glamor's stylesheet and exports a singleton for the rest
*  of the app to use. */

import { StyleSheet } from '../vendor/glamor/sheet'

export default new StyleSheet({ speedy: false, maxLength: 40 })
