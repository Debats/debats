const config = require('./webpack.base.config');

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const CONSTANTS = require('./constants');
const APP_ROOT = CONSTANTS.APP_ROOT;
const APP_PATH = CONSTANTS.APP_PATH;
const APP_NAME = CONSTANTS.APP_NAME;
const SRC_FOLDER = CONSTANTS.SRC_FOLDER;

const env = 'production';
process.env.BABEL_ENV = env;
process.env.NODE_ENV = env;

const outputPath = path.resolve(APP_ROOT + '/build/prod');

const copy_config = [{ context: SRC_FOLDER + '/static', from: '**/*', to: outputPath }];

config.plugins.push(new webpack.DefinePlugin({ 'process.env.NODE_ENV': '"production"' }));
config.plugins.push(new webpack.optimize.DedupePlugin());
config.plugins.push(new webpack.optimize.OccurenceOrderPlugin(true));              // Assign the module and chunk ids by occurrence count
config.plugins.push(new webpack.optimize.UglifyJsPlugin({
    compressor: {screw_ie8: false, keep_fnames: true, warnings: true},
    mangle: {
        except: ['$super', '$', 'exports', 'require'],
        screw_ie8: false,
        keep_fnames: true,
    },
}));
// config.plugins.push(new CompressionPlugin({threshold: 10240}));
config.plugins.push(new CopyWebpackPlugin(copy_config));
config.devtool = 'cheap-module-source-map';
config.cache = false;
config.debug = false;
config.entry = APP_PATH + ('/index.js');
config.output.path = outputPath;;


module.exports = config;
