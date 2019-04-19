const webpack = require('webpack');
const path = require('path');
const CompressionPlugin = require('compression-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
// const Critters = require('critters-webpack-plugin');
require('dotenv').config();

module.exports = {
  entry: './src/main.js',
  output: {
    filename: 'js/bundle.js',
    chunkFilename: 'js/[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  node: {
    fs: 'empty',
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './src/index.html',
      chunksSortMode: 'none',
    }),
    new webpack.DefinePlugin({
      MAPBOX_ACCESS_TOKEN: JSON.stringify(process.env.MAPBOX_ACCESS_TOKEN),
    }),
    // new BundleAnalyzerPlugin(),
    // new Critters(),
    new CompressionPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
        ],
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [
          'file-loader',
        ],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: [
          'file-loader',
        ],
      },
      {
        test: /\.(csv|tsv)$/,
        use: [
          'csv-loader',
        ],
      },
      {
        test: /\.xml$/,
        use: [
          'xml-loader',
        ],
      },
    ],
  },
};
