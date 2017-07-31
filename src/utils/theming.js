// @flow
// $FlowFixMe
import { createTheming } from 'theming'

// NOTE: DO NOT CHANGE, changing this is a semver major change!
export const CHANNEL = '__styled-components__'

export const { CHANNEL: chanel, withTheme, ThemeProvider, themeListener } = createTheming(CHANNEL)
