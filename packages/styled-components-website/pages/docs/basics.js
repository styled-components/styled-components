import React from 'react'
import DocsLayout from '../../components/DocsLayout'

import GettingStarted from '../../components/basics/getting-started'
import PassedProps from '../../components/basics/passed-props'
import AdaptingBasedOnProps from '../../components/basics/adapting-based-on-props'
import OverridingComponentStyles from '../../components/basics/overriding-component-styles'

const Basics = () => (
  <DocsLayout title="Basics">
    <GettingStarted />
    <PassedProps />
    <AdaptingBasedOnProps />
    <OverridingComponentStyles />
  </DocsLayout>
)

export default Basics
