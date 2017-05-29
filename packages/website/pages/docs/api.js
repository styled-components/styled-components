import React from 'react'
import DocsLayout from '../../components/DocsLayout'

import Primary from '../../components/api/primary'
import Helpers from '../../components/api/helpers'
import SupportedCSS from '../../components/api/supported-css'
import Flow from '../../components/api/flow'
import TypeScript from '../../components/api/typescript'

const APIReference = () => (
  <DocsLayout title="API Reference">
    <Primary />
    <Helpers />
    <SupportedCSS />
    <Flow />
    <TypeScript />
  </DocsLayout>
)

export default APIReference
