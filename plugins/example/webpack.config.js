const path = require('path');
const { WebpackVersionPlugin } = require('../webpack-version-plugin');

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  plugins: [
    new WebpackVersionPlugin({
      outputPath: 'dist/version.json',
      versionInfo: {
        name: 'webpack-example',
        version: new Date().toISOString().slice(0, 10),
        description: 'Example of using the WebpackVersionPlugin',
      },
      includeTimestamp: true,
      includeHash: true,
    }),
  ],
}; 