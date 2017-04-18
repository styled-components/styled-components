import React, { Component } from 'react'
import { findDOMNode } from 'react-dom'

const captureScroll = Component => {
  class CaptureScroll extends Component {
    onScroll = evt => {
      const { deltaY } = evt
      const { offsetHeight, scrollHeight, scrollTop } = this.node

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
