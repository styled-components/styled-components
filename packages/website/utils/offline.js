if (
  process.env.NODE_ENV === 'production' &&
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator
) {
  navigator.serviceWorker.register('/sw.js', {
    scope: './'
  }).then(function(reg) {
    reg.onupdatefound = function() {
      const installingWorker = reg.installing;

      installingWorker.onstatechange = function() {
        switch (installingWorker.state) {
          case 'installed':
            if (navigator.serviceWorker.controller) {
              console.log('New or updated content is available.');
            } else {
              console.log('Content is now available offline!');
            }
            break;
          case 'redundant':
            console.log('The installing serviceWorker became redundant.');
            break;
        }
      }
    }
  }).catch(function(e) {
    console.error('Error during service worker registration:', e);
  });
}
