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

  onRouteChange = () => {
    this.setState({ isFolded: true })
  }

  render() {
    const { isFolded } = this.state

    return (
      <Sidebar>
        <Head>
          <Link href="/docs">
            <Logo />
          </Link>

          <Text>
            <Link href="/docs">
              Styled Components
            </Link>
          </Text>

          <MenuButton onClick={this.onFold} />
        </Head>

        <Menu
          isFolded={isFolded}
          onRouteChange={this.onRouteChange}
        />
      </Sidebar>
    )
  }
}

export default Navbar
