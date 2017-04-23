# Flow Support

Styled-components has first-level [flow](https://flowtype.org) support to help
you find typing errors while using our public API.

Sadly, `flow` does not work right out-of-the-box, since there isn't a
best practise how to isolate typing dependencies etc. on a module level yet.

This document should give you an idea how to setup your `.flowconfig`, so you
can use `styled-components` without any hassle.

(First we will give you some context what `flow` requires to type-check
 `node_modules/styled-components` properly,... if you are not interested in the
 details, just go to the `.flowconfig` example at the end of this document)

## Libdef Dependencies

A libdef is a descriptive file for an external untyped 3rd party module used by
our library. You can find all our dependencies in the
[flow-typed](../flow-typed) directory.  All files located in
[flow-typed/npm](../flow-typed/npm) are downloaded or auto-stubbed versions via the `flow-typed` binary,
files located in `flow-typed/` are adapted versions of `flow-typed/npm` files.

Those adapted files might collide with your locally used libdefs like
`lodash`... while adapting some libdefs, we made sure not to introduce breaking
changes, so you can safely use them instead of the official ones found on
`flow-typed`.

* `flow-typed/lodash_v4.x.x.js` : We added some declarations for file-specific imports (e.g. `lodash/isFunction`)
* `flow-typed/react-native.js` : This will be very useful for non-react-native related applications, to mute react-native related import errors

It has to be noted that some of these libdef files are mostly "stubs", so they
default to type `any`, which is kinda bad. We would really appreciate help in
contributing libdef typings to the [`flow-typed`](https://github.com/flowtype/flow-typed)
project, to make this project even more typesafe!

## Example `.flowconfig`

It's usually easier to just see some example how to set up the `.flowconfig`, so
here is our current recommendation:

```
[ignore]
# We vendor our src directory, which is not needed for type-checking
.*/styled-components/src/.*

[include]

[libs]
# This is where your own flow-typed libdefs go
flow-typed

# These declarations are super explicit...
# We want to show what libdef files we need to make
# flow understand all external dependencies
#
# If you have similar dependencies, you will need to
# check which libdef files are covered by your flow-typed
# directory!
#
# A more generic approach (please use with caution!):
# node_modules/styled-components/flow-typed/*.js

node_modules/styled-components/flow-typed/react-native.js
node_modules/styled-components/flow-typed/lodash_v4.x.x.js
node_modules/styled-components/flow-typed/inline-style-prefixer_vx.x.x.js

[options]
```
