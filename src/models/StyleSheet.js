// @flow

/* Wraps glamor's stylesheet and exports a singleton for styled components
to use. */

import { StyleSheet } from '../vendor/glamor/sheet'

export default new StyleSheet({ speedy: false, maxLength: 40 })
