const webpack = require('webpack');
const config = require('./webpack.base.config');

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const CONSTANTS = require('./constants');
const APP_ROOT = CONSTANTS.APP_ROOT;
const SRC_FOLDER = CONSTANTS.SRC_FOLDER;

const args = require('yargs').argv;

const env = 'development';
process.env.BABEL_ENV = env;
process.env.NODE_ENV = env;

const outputPath = path.resolve(`${APP_ROOT}/build/dev-server`);

const copyConfig = [
    { context: `${SRC_FOLDER}/static`, from: '**/*', to: outputPath },
    { from: 'mocks', to: `${outputPath}/fake-api` },
];

config.plugins.push(new webpack.DefinePlugin({ 'process.env.NODE_ENV': '"development"' }));
config.plugins.push(new webpack.NamedModulesPlugin());
config.plugins.push(new CopyWebpackPlugin(copyConfig));
config.output.path = outputPath;
config.devtool = 'source-map';
config.cache = true;
config.debug = true;

config.externals.Config = JSON.stringify(require('../config/dev.config.json'));

var devServerAPIUrl;
var devServerRewrite;

if (args.proxy) {
    if (args.mockAPI) {
        devServerAPIUrl = 'http://localhost:3030';
        devServerRewrite = function rewrite(req) {
            req.url = req.url                               // eslint-disable-line no-param-reassign
                .replace(/\/api\//, '/fake-api/')       // Local mocks as API
                .split('?')[0];                         // strip query string if exists
            if (req.method === 'POST') req.method = 'GET';  // eslint-disable-line no-param-reassign
        };
    }
    if (args.prodAPI) devServerAPIUrl = 'http://api.débats.co';
}

config.devServer = {
    quiet: false,
    stats: { colors: true },
    outputPath,
    proxy: {
        '/api/*': {
            target: devServerAPIUrl,
            rewrite: devServerRewrite,
            changeOrigin: true,
            secure: false,
        },
    },
};

module.exports = config;
