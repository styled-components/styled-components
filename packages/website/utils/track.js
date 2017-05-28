import fetch from 'isomorphic-fetch'
import Router from 'next/router'

if (
  (navigator.doNotTrack && navigator.doNotTrack !== 'no') ||
  window.doNotTrack ||
  navigator.msDoNotTrack
) {
  console.log('Tracking is disabled due to the Do Not Track policy of this browser.')
} else {
  console.log('Tracking is enabled. If you do not want your page view to be tracked enable the "Do Not Track" policy in your browser settings.')

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
}
