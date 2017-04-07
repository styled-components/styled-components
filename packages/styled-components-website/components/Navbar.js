import React, { Component } from 'react'
import styled from 'styled-components'
import rem from 'polished/lib/helpers/rem'

import { pages } from '../pages/docs.json'

const Sidebar = styled.nav`
  position: fixed;
  display: block;

  left: 0;
  top: 0;
  bottom: 0;
  right: auto;

  width: ${rem(300)};
  height: 100%;
  background: linear-gradient(20deg, rgb(219, 112, 147), rgb(243, 182, 97));
  box-sizing: border-box;
  color: white;

  @media (max-width: 1000px) {
    bottom: auto;
    right: 0;
    height: auto;
    width: 100%;
  }
`

const Head = styled.div`
  height: auto;

  @media (max-width: 1000px) {
    height: ${rem(70)};
  }
`

const Menu = styled.aside`
  display: block;
  box-sizing: border-box;

  @media (max-width: 1000px) {
    height: ${p => p.isFolded ? '0' : `calc(100vh - ${rem(70)})`};
    transition: height .3s ease-in-out;
    overflow: hidden;
  }
`

const Logo = styled.img.attrs({
  alt: 'Styled Components',
  src: '/static/logo.png'
})`
  display: block;
  width: 100%;
  height: auto;
  padding: ${rem(65)} ${rem(85)} ${rem(45)};
  box-sizing: border-box;

  @media (max-width: 1000px) {
    width: auto;
    height: 100%;
    padding: ${rem(5)};
  }
`

const Link = styled.a`
  display: block;
  margin: ${rem(10)} ${rem(40)};
`

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

        <Menu isFolded={isMenuFolded}>
          {
            pages.map(({ title }) => (
              <Link key={title}>{title}</Link>
            ))
          }
        </Menu>
      </Sidebar>
    )
  }
}

export default Navbar
