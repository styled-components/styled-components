// @flow
/**
 * Creates a broadcast that can be listened to, i.e. simple event emitter
 *
 * @see https://github.com/ReactTraining/react-broadcast
 */

export type Broadcast = {
  publish: (value: mixed) => void,
  subscribe: (listener: (currentValue: mixed) => void) => number,
  unsubscribe: (number) => void,
}

const createBroadcast = (initialState: mixed): Broadcast => {
  const listeners = {}
  let id = 0
  let state = initialState

  function publish(nextState: mixed) {
    state = nextState

     // eslint-disable-next-line guard-for-in, no-restricted-syntax
    for (const key in listeners) {
      const listener = listeners[key]
      if (listener === undefined) {
        // eslint-disable-next-line no-continue
        continue
      }

      listener(state)
    }
  }

  function subscribe(listener) {
    const currentId = id
    listeners[currentId] = listener
    id += 1
    listener(state)
    return currentId
  }

  function unsubscribe(unsubID: number) {
    listeners[unsubID] = undefined
  }

  return { publish, subscribe, unsubscribe }
}

export default createBroadcast
