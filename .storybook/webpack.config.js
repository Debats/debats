const loaders = require('../webpack/loaders.js');
const postcssProcessors = require('../webpack/postcss-processors');

module.exports = {
    module: {
        loaders,
    },
    externals: {
        TweenLite: 'TweenLite',
    },
    node: {
        fs: 'empty',
    },
    postcss: wp => postcssProcessors(wp),
};
