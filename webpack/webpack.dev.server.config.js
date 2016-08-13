const config = require('./webpack.base.config');

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const CONSTANTS = require('./constants');
const APP_ROOT = CONSTANTS.APP_ROOT;
const APP_PATH = CONSTANTS.APP_PATH;
const APP_NAME = CONSTANTS.APP_NAME;
const SRC_FOLDER = CONSTANTS.SRC_FOLDER;

const args = require('yargs').argv;

const env = 'development';
process.env.BABEL_ENV = env;
process.env.NODE_ENV = env;

const outputPath = path.resolve(APP_ROOT + '/build/dev-server');

const copy_config = [
    {context: SRC_FOLDER + '/static', from: '**/*', to: outputPath},
    {from: 'mocks', to: outputPath + '/fake-api'},
];

config.plugins.push(new webpack.DefinePlugin({ 'process.env.NODE_ENV': '"development"' }));
config.plugins.push(new webpack.NamedModulesPlugin());
config.plugins.push(new CopyWebpackPlugin(copy_config));
config.output.path = outputPath;
config.devtool = 'source-map';
config.cache = true;
config.debug = true;

var devServerAPIUrl, devServerRewrite;
if (args.proxy) {
    if (args.mockAPI) {
        devServerAPIUrl = 'http://localhost:3000';
        devServerRewrite = function(req) {
            req.url = req.url
                    .replace(/\/api\//, '/fake-api/')       // Local mocks as API
                    .split('?')[0];                         // strip query string if exists
            if (req.method === "POST") req.method = 'GET';  // Change to GET only
        };
    }
    if (args.prodAPI) devServerAPIUrl = 'http://api.débats.co';
};

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
