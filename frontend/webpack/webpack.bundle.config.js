const config = require('./webpack.base.config');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const CONSTANTS = require('./constants');

const APP_PATH = CONSTANTS.APP_PATH;
const APP_NAME = CONSTANTS.APP_NAME;
const SRC_FOLDER = CONSTANTS.SRC_FOLDER;


config.plugins.push(new HtmlWebpackPlugin({
  template: `${SRC_FOLDER}/index.html`,
  inject: true,
  filename: 'index.html',
}));

config.entry = `${APP_PATH}/index.jsx`;
config.output = {
  filename: `${APP_NAME}.[name].[hash].js`,
};

module.exports = config;
