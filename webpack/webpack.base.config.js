const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const postcssProcessors = require('./postcss-processors');
const loaders = require('./loaders');

const CONSTANTS = require('./constants');
const APP_ROOT = CONSTANTS.APP_ROOT;
const APP_PATH = CONSTANTS.APP_PATH;
const APP_NAME = CONSTANTS.APP_NAME;
const SRC_FOLDER = CONSTANTS.SRC_FOLDER;

// Set-up common plugins
const plugins = [];

plugins.push(new webpack.NoErrorsPlugin()); // No assets emitted with errors
plugins.push(new ExtractTextPlugin('[name].[contenthash].css', { allChunks: false })); // Extract CSS to external style.css file
plugins.push(new HtmlWebpackPlugin({
    template: `${SRC_FOLDER}/index.html`,
    inject: true,
    filename: 'index.html',
}));

module.exports = {
    resolve: {
        alias: {
            react: path.resolve(APP_ROOT, 'node_modules/react'),
        },
        modulesDirectories: ['src', 'web_modules', 'node_modules'],
        extensions: ['', '.js', '.jsx'],
    },
    entry: `${APP_PATH}/index.js`,
    output: {
        filename: `${APP_NAME}.[name].[hash].js`,
    },
    plugins,
    module: {
        loaders: [
            ...loaders,
        ],
    },
    externals: {
        TweenLite: 'TweenLite',
    },
    node: {
        fs: 'empty',
    },
    postcss: wp => postcssProcessors(wp),
};
