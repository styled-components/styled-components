/* eslint-disable flowtype/require-valid-file-annotation */
import React from 'react'

import { hydrate } from 'react-dom'

import App from './App'

hydrate(<App />, document.querySelector('#react-root'))
