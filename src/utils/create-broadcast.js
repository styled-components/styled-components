// @flow
/**
 * Creates a broadcast that can be listened to, i.e. simple event emitter
 *
 * @see https://github.com/ReactTraining/react-broadcast
 */

export type Broadcast = {
  publish: (value: mixed) => void,
  subscribe: (listener: (currentValue: mixed) => void) => () => void
}

const createBroadcast = (initialValue: mixed): Broadcast => {
  let listeners = []
  let currentValue = initialValue

  return {
    publish(value: mixed) {
      currentValue = value
      listeners.forEach(listener => listener(currentValue))
    },
    subscribe(listener) {
      listeners.push(listener)

      // Publish to this subscriber once immediately.
      listener(currentValue)

      return () => {
        listeners = listeners.filter(item => item !== listener)
      }
    },
  }
}

export default createBroadcast
