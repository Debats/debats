const config = require('./webpack.base.config');

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const CONSTANTS = require('./constants');
const APP_ROOT = CONSTANTS.APP_ROOT;
const APP_PATH = CONSTANTS.APP_PATH;
const APP_NAME = CONSTANTS.APP_NAME;
const SRC_FOLDER = CONSTANTS.SRC_FOLDER;

const env = 'development';
process.env.BABEL_ENV = env;
process.env.NODE_ENV = env;

const outputPath = path.resolve(APP_ROOT + '/build/dev');

const copy_config = [{ context: SRC_FOLDER + '/static', from: '**/*', to: outputPath }];

config.plugins.push(new webpack.DefinePlugin({ 'process.env.NODE_ENV': '"development"' }));
config.plugins.push(new CopyWebpackPlugin(copy_config));
config.devtool = 'source-map';
config.cache = true;
config.debug = true;
config.output.path = outputPath;

module.exports = config;
