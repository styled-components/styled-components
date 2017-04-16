import React from 'react'
import DocsLayout from '../../components/DocsLayout'

import Primary from '../../components/api/primary'
import Helpers from '../../components/api/helpers'
import SupportedCSS from '../../components/api/supported-css'

const APIReference = () => (
  <DocsLayout title="API Reference">
    <Primary />
    <Helpers />
    <SupportedCSS />
  </DocsLayout>
)

export default APIReference
