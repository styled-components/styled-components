const path = require('path');
const SWPrecacheWebpackPlugin = require('sw-precache-webpack-plugin')

module.exports = {
  webpack: function (config, { dev }) {
    const oldEntry = config.entry

    config.entry = () => oldEntry()
      .then(entry => {
        entry['main.js'].push(
          path.resolve('./utils/offline.js')
        )

        return entry
      })

    if (dev) {
      return config
    }

    config.plugins.push(
      new SWPrecacheWebpackPlugin({
        filename: 'sw.js',
        minify: true,
        staticFileGlobsIgnorePatterns: [/\.next\//],
        staticFileGlobs: [
          'static/**/*' // Precache all static files by default
        ],
        forceDelete: true,
        runtimeCaching: [
          // Example with different handlers
          {
            handler: 'fastest',
            urlPattern: /[.](png|jpg|css)/
          },
          {
            handler: 'networkFirst',
            urlPattern: /^http.*/ //cache all files
          }
        ]
      })
    );

    config.resolve.alias = {
      'react': 'preact-compat/dist/preact-compat',
      'react-dom': 'preact-compat/dist/preact-compat'
    }

    return config
  }
}
