/**
 * Creates a broadcast that can be listened to, i.e. simple event emitter
 *
 * @see https://github.com/ReactTraining/react-broadcast
 */
const createBroadcast = (initialValue) => {
  let listeners = []
  let currentValue = initialValue

  return {
    publish(value) {
      currentValue = value
      listeners.forEach(listener => listener(currentValue))
    },
    subscribe(listener) {
      listeners.push(listener)

      // Publish to this subscriber once immediately.
      listener(currentValue)

      // eslint-disable-next-line no-return-assign
      return () =>
        listeners = listeners.filter(item => item !== listener)
    },
  }
}

export default createBroadcast
