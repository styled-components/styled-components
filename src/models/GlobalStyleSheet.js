// @flow

/* Wraps glamor's stylesheet and exports a singleton for global styles. */
import { StyleSheet } from '../vendor/glamor/sheet'

/* Don't specify a maxLength, since these rules are defined at initialization
*  and should remain static after that */
export default new StyleSheet({ speedy: false })
