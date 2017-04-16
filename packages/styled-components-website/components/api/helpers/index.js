import React from 'react'
import SectionLayout from '../../SectionLayout'

import CSS from './css'
import Keyframes from './keyframes'
import InjectGlobal from './inject-global'
import WithTheme from './with-theme'

const Helpers = () => (
  <SectionLayout title="Helpers">
    <CSS />

    <br /><br />

    <Keyframes />

    <br /><br />

    <InjectGlobal />

    <br /><br />

    <WithTheme />
  </SectionLayout>
)

export default Helpers
