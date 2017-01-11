# Security

**Please do not forget to sanitize and validate input!**

`styled-components` allows you to interpolate all kinds of things into your CSS. Some of these interpolations can consist of more than one declaration:

```JS
// This totally works!
const red = 'color: palevioletred; background: papayawhip;';

const Button = styled.button`
  ${red}
`
```

As powerful as this is, it's also a potential security hazard if you're not mindful because it allows CSS injection. Imagine something like this:

```JS
import { someCSS } from '../utils-my-coworker-wrote';

const Box = styled.div`
  ${someCSS}
`
```

Now you glanced at this `someCSS` variable and somewhere inside the code this is declared:

```JS
const someCSS = `
  /* More styles here */
  background: url(/api/withdraw-funds);
  /* More styles here */
`
```

**⚠ OH NO ⚠** whenever you render this `Box` all of the users funds are withdrawn!

### Be very careful when interpolating more than a simple value.

This is obviously a made-up example, but CSS injection can be unobvious and have bad repercussions. (some IE versions [execute arbitrary JavaScript within `url` declarations](http://httpsecure.org/?works=css-injection) or [within the `expression` directive](https://stackoverflow.com/questions/3607894/cross-site-scripting-in-css-stylesheets) 😱)

----

This is especially important when you take user input:

Imagine you have an app which allows users to provide custom themes by pasting some CSS. Somebody posts a dark theme on their blog so users can have a "night mode". Super cool!

Somewhere within this long string of CSS you let your users provide, the poster embedded our tiny declaration again:

```CSS
.YourApp__navbar__item--active {
  background: url(/api/withdraw-funds);
}
```

**⚠ OH NO ⚠** suddenly, every user that finds this random theme on Google and copy and pastes it to your app interface withdraws all their funds!

### Constrain user input

If you let users input or configure themes, please make sure to constrain the inputs. The most important thing to keep in mind is to never let users provide more than simple values. As soon as you allow arbitrary CSS declarations, exploits like the one above become possible. For example, let users provide just six hex colors to configure the general skin of your app!

By applying  constraints to your themes, validation becomes much easier – run a short regex (like `/^#([A-F0-9]{6}|[A-F0-9]{3})$/i` for hex colors) or validation functions over the inputs to make sure what's provided contains nothing but simple values.
