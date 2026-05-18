module.exports = {
  presets: ['../../babel-preset.cjs'],
  plugins: [
    'babel-plugin-react-native-web',
    ['styled-jsx/babel', { optimizeForSpeed: true }],
    [
      'module-resolver',
      {
        alias: {
          '^react-native$': 'react-native-web',
        },
      },
    ],
  ],
};
