const path = require('path');
const lost = require('lost');
const atImport = require('postcss-import');
const postcssMixins = require('postcss-mixins');
const postcssNext = require('postcss-cssnext');
const webpackPostcssTools = require('webpack-postcss-tools');
const postcssAssets = require('postcss-assets');
const postcssColorFunction = require('postcss-color-function');
const postcssShortPosition = require('postcss-short-position');
const postcssInlineSVG = require('postcss-inline-svg');
const postcssHide = require('postcss-hide');

const CONSTANTS = require('./constants');

const makeMap = aPath => {
    try {
        return webpackPostcssTools.makeVarMap(aPath);
    } catch (e) {
        // console.log(`${aPath} not found.`);
        process.exit(1);
    }
    return null;
};

const map = makeMap('./src/styles/_constants.css');

module.exports = webpack => [
    postcssMixins({
        mixinsDir: path.join(CONSTANTS.APP_PATH, 'style', 'mixins'),
    }),
    atImport({
        addDependencyTo: webpack,
        root: CONSTANTS.APP_PATH,
        path: ['style', 'web_modules'],
    }),
    postcssShortPosition(),
    postcssAssets(),
    postcssColorFunction(),
    postcssNext({
        features: {
            customProperties: {
                variables: map.vars,
                warnings: false,
            },
        },
    }),
    lost(),
    postcssInlineSVG(),
    postcssHide(),
];
