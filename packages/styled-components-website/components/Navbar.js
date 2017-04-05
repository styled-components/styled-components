import React from 'react'
import styled from 'styled-components'
import rem from 'polished/lib/helpers/rem'

import { pages } from '../pages/docs.json'

const Sidebar = styled.nav`
  position: fixed;
  display: block;

  left: 0;
  top: 0;
  bottom: 0;

  width: ${rem(300)};
  background: linear-gradient(20deg, rgb(219, 112, 147), rgb(243, 182, 97));
  padding: ${rem(20)} ${rem(40)};
  box-sizing: border-box;
  color: white;
`

const Logo = styled.img.attrs({
  alt: 'Styled Components',
  src: '/static/logo.png'
})`
  display: block;
  width: 100%;
  padding: ${rem(45)};
  box-sizing: border-box;
`

const Link = styled.a`
  display: block;
  margin: ${rem(10)} 0;
`

const Navbar = () => (
  <Sidebar>
    <Logo />

    {
      pages.map(({ title }) => (
        <Link key={title}>{title}</Link>
      ))
    }
  </Sidebar>
)

export default Navbar
