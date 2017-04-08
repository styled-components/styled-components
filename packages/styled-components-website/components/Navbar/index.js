import React, { Component } from 'react'
import Sidebar from './Sidebar'
import Head from './Head'
import Logo from './Logo'
import Menu from './Menu'

class Navbar extends Component {
  state = {
    isMenuFolded: true
  }

  toggleMenu = () => {
    this.setState(s => ({ isMenuFolded: !s.isMenuFolded }))
  }

  render() {
    const { isMenuFolded } = this.state

    return (
      <Sidebar>
        <Head>
          <Logo onClick={this.toggleMenu} />
        </Head>

        <Menu isFolded={isMenuFolded} />
      </Sidebar>
    )
  }
}

export default Navbar
