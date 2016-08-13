const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin');

const postcssProcessors = require('./postcss-processors');


const CONSTANTS = require('./constants');
const APP_ROOT = CONSTANTS.APP_ROOT;
const APP_PATH = CONSTANTS.APP_PATH;
const APP_NAME = CONSTANTS.APP_NAME;
const SRC_FOLDER = CONSTANTS.SRC_FOLDER;


const plugins = [];
plugins.push(new webpack.NoErrorsPlugin());                                 // No assets emitted with errors
plugins.push(new ExtractTextPlugin('[name].[contenthash].css', { allChunks: false }));  // Extract CSS to external style.css file
plugins.push(new HtmlWebpackPlugin({ template: SRC_FOLDER + '/index.html', inject: false, filename: 'index.html' }));


module.exports = {
    resolve: {
        alias: {
            react: path.resolve(APP_ROOT, 'node_modules/react'),
        },
        modulesDirectories: ['src', 'web_modules', 'node_modules'],
        extensions: ["", ".js", ".jsx"]
    },
    entry: APP_PATH + ('/index.js'),
    output: {
        filename: APP_NAME + '.[name].[hash].js',
    },
    externals: {
        TweenLite: 'TweenLite',
    },
    node: {
        fs: 'empty',
    },
    plugins,
    module: {
        loaders: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                loader: 'style-loader!css-loader?modules&localIdentName=[name]__[local]___[hash:base64:5]&importLoaders=1!postcss-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.(png|svg|gif|jpeg|jpg)$/,
                include: APP_PATH,
                loader: 'file-loader?name=images/[name].[ext]',
            },
            {
                test: /\.(eot|woff|ttf)$/,
                loader: 'file-loader?name=fonts/[name].[ext]',
            },
            {
                test: /\.json$/,
                loader: 'json',
            },
        ],
    },
    postcss: webpack => postcssProcessors(webpack),
}