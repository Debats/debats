const webpack = require('webpack');

const postcssProcessors = require('./postcss-processors');
const loaders = require('./loaders');
const resolve = require('./resolve');

// Set-up common plugins
const plugins = [];

plugins.push(new webpack.NoErrorsPlugin()); // No assets emitted with errors

module.exports = {
  resolve,
  plugins,
  module: { loaders },
  externals: {
    TweenLite: 'TweenLite',
  },
  node: {
    fs: 'empty',
  },
  postcss: wp => postcssProcessors(wp),
};
