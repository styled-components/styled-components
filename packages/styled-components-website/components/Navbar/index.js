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
    let isFolded = !this.state.isFolded
    if(!isFolded) {
      document.body.classList.add('sticky')
    } else {
      document.body.classList.remove('sticky')
    }
    this.setState({
      isFolded: isFolded
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
          <Link unstyled href="/docs">
            <Logo />
          </Link>

          <Text>
            <Link unstyled href="/docs">
              styled-components
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
