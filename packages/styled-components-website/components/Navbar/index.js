import React, { Component } from 'react'
import Sidebar from './Sidebar'
import Head from './Head'
import Logo from './Logo'
import Text from './Text'
import Menu from './Menu'
import Link from '../Link'

const Navbar = () => (
  <Sidebar>
    <Head>
      <Logo />
      <Text>
        Styled Components
      </Text>
    </Head>

    <Menu />
  </Sidebar>
)

export default Navbar
