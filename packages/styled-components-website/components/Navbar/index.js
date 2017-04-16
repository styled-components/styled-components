import React, { Component } from 'react'
import Sidebar from './Sidebar'
import Head from './Head'
import Logo from './Logo'
import Menu from './Menu'
import Link from '../Link'

const Navbar = () => (
  <Sidebar>
    <Head>
      <Link href="/docs">
        <Logo />
      </Link>
    </Head>

    <Menu />
  </Sidebar>
)

export default Navbar
