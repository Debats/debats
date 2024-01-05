const CONSTANTS = require('../webpack/constants');

const APP_PATH = CONSTANTS.APP_PATH;

const loaders = [
  {
    test: /\.jsx?$/,
    loader: 'babel-loader',
    exclude: /node_modules/,
  },
  {
    test: /src.+\.css$/,
    loader: 'style-loader'
    + '!css-loader'
    + '?modules&localIdentName=[name]__[local]___[hash:base64:5]'
    + '&importLoaders=1'
    + '!postcss-loader',
  },
  {
    test: /node_modules.*\.css$/,
    loader: 'style-loader'
    + '!css-loader'
    + '!postcss-loader',
  },
  {
    test: /\.(png|svg|gif|jpeg|jpg)$/,
    include: APP_PATH,
    loader: 'file?name=images/[name].[ext]',
  },
  {
    test: /\.(eot|woff|woff2|ttf)$/,
    include: APP_PATH,
    loader: 'file-loader?name=fonts/[name].[ext]',
  },
  {
    test: /\.(svg|woff2?)$/,
    exclude: APP_PATH,
    loader: 'url?limit=10000',
  },
  {
    test: /\.(ttf|eot)$/,
    exclude: APP_PATH,
    loader: 'file',
  },
  {
    test: /\.json$/,
    loader: 'json',
  },
  {
    test: /\.md$/,
    loader: 'raw',
  },
];

module.exports = loaders;
