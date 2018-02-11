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
      'styled-components automatically does streaming SSR rehydration now.\n' +
        'Calling consolidateStreamedStyles manually is no longer necessary and a noop now.\n' +
        '- Please remove the consolidateStreamedStyles call from your client.'
    )
  }
}
