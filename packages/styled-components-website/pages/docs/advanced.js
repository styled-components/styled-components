import React from 'react'
import DocsLayout from '../../components/DocsLayout'

import Theming from '../../components/advanced/theming'
import Refs from '../../components/advanced/refs'
import Security from '../../components/advanced/security'

const Advanced = () => (
  <DocsLayout title="Advanced">
    <Theming />
    <Refs />
    <Security />
  </DocsLayout>
)

export default Advanced
