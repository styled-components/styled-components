---
'styled-components': minor
---

Multi-shadow `text-shadow` lists are supported. React Native renders a single shadow per Text element, so on iOS and Android the first (topmost) shadow in the list is applied and a development warning suggests stacking duplicate Text elements for more layers. On the web the browser renders the full list as written.
