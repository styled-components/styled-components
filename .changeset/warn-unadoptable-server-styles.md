---
'styled-components': patch
---

A development warning fires when server-rendered styles reach the browser inside a `<style>` tag that React manages through its `precedence` attribute. React serves such a tag under its own attributes, so styled-components cannot recognize the styles as its own and injects every rule a second time on the client. The page still looks correct, which is why this goes unnoticed, and the warning names the fix: emit the tag from `ServerStyleSheet#getStyleElement()` and pass neither `precedence` nor `href`.

The warning covers server styles found in the document or in a shadow root at the moment styles are adopted. Styles that arrive later, such as those flushed for a Suspense boundary that resolves after adoption, are outside its reach.
