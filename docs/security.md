# Security

**Please do not forget to sanitise and validate user input!**

`styled-components` makes it easy to let users provide themes for your apps. These themes can then be shared with others, and you can create a theme ecosystem around your app. That's great!

You need to be aware of the fact that this is a potential security hazard. Let's look at a short example to showcase this:

Imagine a theme posted on somebody's blog which makes your app have a night mode. Super cool! Somewhere within this long string of CSS you let your users provide, the poster embedded this tiny declaration:

```CSS
.YourApp__navbar__item--active {
  background: url(https://evilsite.com/hack-this-site);
}
```

**⚠ OH NO ⚠**

Suddenly, every user that finds this random theme on Google and copy and pastes it to your app interface gives all of their payment information to some random person!

## Constrain your users input

If you let users input or configure themes, please make sure to constrain the inputs. The most important thing to keep in mind is to never let users provide more than simple values. As soon as you allow arbitrary CSS declarations, exploits like the one above become possible. For example, let users provide just six hex colors to configure the general skin of your app!

By applying  constraints to your themes, validation becomes much easier – running a short regex (like `/^#([A-F0-9]{6}|[A-F0-9]{3})$/i` for hex colors) or validation functions over the inputs to make sure what's provided contains nothing but simple values.
