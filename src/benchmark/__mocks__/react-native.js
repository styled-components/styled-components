// @flow
import { createElement } from 'react'

export const StyleSheet = {
  create: () => ({}),
}

export default {
  View: (props: any): any => createElement('tag', props),
}
