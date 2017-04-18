import React, { Component } from 'react'
import { findDOMNode } from 'react-dom'

let lastWheelTimestamp

if (typeof window !== 'undefined') {
  window.addEventListener('wheel', ({ timeStamp }) => {
    lastWheelTimestamp = timeStamp
  })
}

const captureScroll = Component => {
  class CaptureScroll extends Component {
    onScroll = evt => {
      // Don't access window wheel listener
      evt.stopImmediatePropagation()

      const { timeStamp, deltaY } = evt
      const { offsetHeight, scrollHeight, scrollTop } = this.node

      // If the window is being scrolled, don't scroll the captured scroll area
      if (timeStamp - lastWheelTimestamp <= 400) {
        lastWheelTimestamp = timeStamp

        evt.preventDefault()
        window.scrollBy(0, deltaY)
        return
      }

      const maxScrollTop = scrollHeight - offsetHeight

      // Has the scroll area reached it's beginning/end
      const hasReachedTop = deltaY < 0 && scrollTop === 0
      const hasReachedBottom = deltaY > 0 && scrollTop >= maxScrollTop

      // Is the trajectory overshooting the scroll area
      const isReachingTop = scrollTop + deltaY <= 0
      const isReachingBottom = scrollTop + deltaY >= maxScrollTop

      if (
        hasReachedTop ||
        hasReachedBottom ||
        isReachingTop ||
        isReachingBottom
      ) {
        evt.preventDefault()
      }

      // If we're overshooting, we need to set the maximum available position
      if (isReachingTop || isReachingBottom) {
        this.node.scrollTop = isReachingTop ? 0 : maxScrollTop
      }
    }

    componentDidMount() {
      this.node = findDOMNode(this.ref)
      this.node.addEventListener('wheel', this.onScroll)
    }

    componentWillUnmount() {
      this.node.removeEventListener('wheel', this.onScroll)
    }

    render() {
      return (
        <Component
          {...this.props}
          ref={x => this.ref = x}
        />
      )
    }
  }

  return CaptureScroll
}

export default captureScroll
