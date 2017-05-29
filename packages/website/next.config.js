const path = require('path');
const SWPrecacheWebpackPlugin = require('sw-precache-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  webpack: function (config, { dev }) {
    config.plugins.push(
      new BundleAnalyzerPlugin({
        analyzerMode: 'disabled',
        // For all options see https://github.com/th0r/webpack-bundle-analyzer#as-plugin
        generateStatsFile: true,
        // Will be available at `.next/stats.json`
        statsFilename: 'stats.json'
      })
    )

    const oldEntry = config.entry

    config.entry = () => oldEntry()
      .then(entry => {
        entry['main.js'].push(
          path.resolve('./utils/offline.js'),
          path.resolve('./utils/track.js')
        )

        entry.commons = ['./utils/prismTemplateString.js']
        return entry
      })

    config.resolve.alias = config.resolve.alias || []

    if (dev) {
      return config
    }

    config.plugins.push(
      new SWPrecacheWebpackPlugin({
        filename: 'sw.js',
        minify: true,
        staticFileGlobsIgnorePatterns: [
          /\.next\//,
          /sc-micro-analytics\.now\.sh/
        ],
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

    config.resolve.alias['react'] = 'preact-compat/dist/preact-compat'
    config.resolve.alias['react-dom'] = 'preact-compat/dist/preact-compat'

    return config
  }
}
