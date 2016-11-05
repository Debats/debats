const path = require('path');

const CONSTANTS = require('./constants');
const APP_ROOT = CONSTANTS.APP_ROOT;

module.exports = {
    alias: {
        react: path.resolve(APP_ROOT, 'node_modules/react'),
    },
    modulesDirectories: ['src', 'web_modules', 'node_modules'],
    extensions: ['', '.js', '.jsx'],
};
