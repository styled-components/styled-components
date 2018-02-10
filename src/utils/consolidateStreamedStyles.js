// @flow

/* This function is DEPRECATED and will be removed on the next major version release.
 * It was needed to rehydrate all style blocks prepended to chunks before React
 * tries to rehydrate its HTML stream. Since the master StyleSheet will now detect
 * the use of streamed style tags and will perform the rehydration earlier when needed
 * this function will not be needed anymore */
export default function consolidateStreamedStyles() {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      'The consolidateStreamedStyles function for streamed SSR rehydration was removed.\n' +
        'The rehydration will now be automatically performed at an earlier point in time ' +
        'on the client so that this function is now not needed anymore and is thus obsolete.\n' +
        '- Consider removing this call on the client and use React + styled-components as you would expect'
    )
  }
}
