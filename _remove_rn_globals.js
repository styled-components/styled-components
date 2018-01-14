// @flow

// @see https://github.com/DefinitelyTyped/DefinitelyTyped/issues/15960
// @see https://gist.github.com/rawrmaan/be47e71bd0df3f7493ead6cefd6b400c

const fs = require('fs')

const reactNativeTypeDef = `${__dirname}/node_modules/@types/react-native/index.d.ts`

fs.writeFileSync(reactNativeTypeDef, fs.readFileSync(reactNativeTypeDef).toString().replace('declare global', 'declare namespace RemovedGlobals'))
