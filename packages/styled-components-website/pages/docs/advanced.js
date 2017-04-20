import React from 'react'
import DocsLayout from '../../components/DocsLayout'
import NextPage from '../../components/NextPage'

import Theming from '../../components/advanced/theming'
import Refs from '../../components/advanced/refs'
import Security from '../../components/advanced/security'
import ExistingCSS from '../../components/advanced/existing-css'
import MediaTemplates from '../../components/advanced/media-templates'
import TaggedTemplateLiterals from '../../components/advanced/tagged-template-literals'

const Advanced = () => (
  <DocsLayout title="Advanced">
    <Theming />
    <Refs />
    <Security />
    <ExistingCSS />
    <MediaTemplates />
    <TaggedTemplateLiterals />

    <NextPage
      href="/docs/api"
      title="API Reference"
    />
  </DocsLayout>
)

export default Advanced
