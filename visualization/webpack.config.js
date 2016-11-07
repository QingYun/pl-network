var webpack = require('webpack');
var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var CopyPlugin = require('copy-webpack-plugin');

process.env.BABEL_ENV = process.env.npm_lifecycle_event;
module.exports = {
  devServer: {
    historyApiFallback: true,
    hot: true,
    inline: true,
    progress: true,
    contentBase: './build',
    outputPath: path.join(__dirname + '/build'),
    port: 8080
  },
  entry: [
    'webpack/hot/dev-server',
    'webpack-dev-server/client?http://localhost:8080',
    path.resolve(__dirname, 'app/main.jsx')
  ],
  output: {
    path: __dirname + '/build',
    publicPath: '/',
    filename: 'bundle.js'
  },
  module: {
    loaders:[
      { test: /\.scss$/, loaders: ['style', 'css', 'sass?sourceMap'] },
      { test: /\.(jpg|png)$/, loader: 'url-loader' },
      { test: /\.js$/, loader: 'babel-loader', exclude: /node_modules/ },
      { test: /\.json$/, loader: 'json-loader' },
      { test: /\.txt/, loader: 'file-loader' },
      { test: /\.jsx?$/, loaders: ['babel?cacheDirectory'], exclude: /node_modules/ },
    ]
  },
  resolve: {
    extensions: ['', '.js', 'jsx'],
  },
  devtool: 'eval',
  target: 'web',
  node: {
    fs: "empty"
  },
  context: __dirname,
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin(),
    new CopyPlugin([{
      from: './data'
    }])
  ]
};
