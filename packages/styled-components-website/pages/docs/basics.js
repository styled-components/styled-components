import React from 'react'
import DocsLayout from '../../components/DocsLayout'
import NextPage from '../../components/NextPage'

import GettingStarted from '../../components/basics/getting-started'
import PassedProps from '../../components/basics/passed-props'
import AdaptingBasedOnProps from '../../components/basics/adapting-based-on-props'
import OverridingComponentStyles from '../../components/basics/overriding-component-styles'
import ThirdPartyComponents from '../../components/basics/third-party-components'
import Animations from '../../components/basics/animations'
import ReactNative from '../../components/basics/react-native'

const Basics = () => (
  <DocsLayout title="Basics">
    <GettingStarted />
    <PassedProps />
    <AdaptingBasedOnProps />
    <OverridingComponentStyles />
    <ThirdPartyComponents />
    <Animations />
    <ReactNative />

    <NextPage
      href="/docs/advanced"
      title="Advanced"
    />
  </DocsLayout>
)

export default Basics
