const path = require('path');

const SRC_FOLDER = 'src';
const APP_ROOT = path.normalize(path.join(__dirname, '..'));

const constants = Object.freeze({
    APP_NAME: 'debats',
    APP_ROOT,
    APP_PATH: path.join(APP_ROOT, SRC_FOLDER),
    STATIC_PATH: path.join(APP_ROOT, SRC_FOLDER, 'static'),
    SRC_FOLDER,
});

module.exports = constants;
