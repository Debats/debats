const config = require('./webpack.bundle.config');
const webpack = require('webpack');

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const CONSTANTS = require('./constants');

const APP_ROOT = CONSTANTS.APP_ROOT;
const SRC_FOLDER = CONSTANTS.SRC_FOLDER;

const env = 'development';
process.env.BABEL_ENV = env;
process.env.NODE_ENV = env;

const outputPath = path.resolve(`${APP_ROOT}/build/dev`);

const copyConfig = [{ context: `${SRC_FOLDER}/static`, from: '**/*', to: outputPath }];

config.plugins.push(new webpack.DefinePlugin({ 'process.env.NODE_ENV': '"development"' }));
config.plugins.push(new CopyWebpackPlugin(copyConfig));
config.devtool = 'source-map';
config.cache = true;
config.debug = true;
config.output.path = outputPath;

module.exports = config;
