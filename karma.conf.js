const webpackConfig = require('./webpack/webpack.base.config');

const karmaConfig = function (config) {
    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '',

        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['mocha', 'chai-things', 'chai-immutable', 'chai', 'sinon', 'sinon-chai'],


        // list of files / patterns to load in the browser
        files: [
            './src/**/*.spec.js',
        ],


        // list of files to exclude
        exclude: [],

        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            './src/**/*.spec.js': ['webpack'],
        },

        webpack: {
            devtool: 'source-map',
            resolve: webpackConfig.resolve,
            plugins: webpackConfig.plugins
                .filter(plugin => !plugin.__KARMA_IGNORE__),
            externals: {
                'react/addons': true, // important : https://github.com/airbnb/enzyme/issues/302
                'react/lib/ExecutionEnvironment': true,
                'react/lib/ReactContext': true,
            },
            module: {
                noParse: [
                    /node_modules\/sinon\//,
                ],
                loaders: webpackConfig.module.loaders,
            },
        },

        webpackMiddleware: {
            // webpack-dev-middleware configuration
            // i. e.
            noInfo: true,
        },
        webpackServer: {
            noInfo: true,  // keep the console clean
        },

        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['progress'],


        // web server port
        port: 9876,


        // enable / disable colors in the output (reporters and logs)
        colors: true,


        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,


        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,


        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['Chrome'],


        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: false,

        // Concurrency level
        // how many browser should be started simultaneous
        concurrency: Infinity,
    });
};

module.exports = karmaConfig;
