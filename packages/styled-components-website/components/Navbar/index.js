import React, { Component } from 'react'
import Sidebar from './Sidebar'
import Head from './Head'
import Logo from './Logo'
import Text from './Text'
import Menu from './Menu'
import MenuButton from './MenuButton'
import Link from '../Link'

class Navbar extends Component {
  state = {
    isFolded: true
  }

  onFold = () => {
    this.setState({
      isFolded: !this.state.isFolded
    })
  }

  render() {
    const { isFolded } = this.state

    return (
      <Sidebar>
        <Head>
          <Logo />
          <Text>Styled Components</Text>
          <MenuButton onClick={this.onFold} />
        </Head>

        <Menu isFolded={isFolded} />
      </Sidebar>
    )
  }
}

export default Navbar
