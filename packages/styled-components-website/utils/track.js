import fetch from 'isomorphic-fetch'
import Router from 'next/router'

const reportView = () => {
  const { pathname } = window.location

  fetch('https://sc-micro-analytics.now.sh' + pathname)
    .then(() => {
      console.log(`Reported page view for ${pathname}.`)
    })
    .catch(err => {
      console.warn('Could not report page view:', err)
    })
}

reportView()

Router.onRouteChangeComplete = () => {
  reportView()
}
