const path = require('path');
const webpack = require('webpack');
const MinifyPlugin = require('babel-minify-webpack-plugin');
const LodashModuleReplacementPlugin = require('lodash-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';

let plugins = [
  new webpack.DefinePlugin({
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development')
    },
    global: {}
  }),
  new ExtractTextPlugin('[name]/style.bundle.css'),
  isProduction ? new LodashModuleReplacementPlugin() : null,
  new webpack.optimize.CommonsChunkPlugin({
    names: ['vue', 'manifest'],
    filename: '[name].bundle.js',
    minChunks: Infinity
  }),
  new webpack.optimize.CommonsChunkPlugin({
    name: 'commons-ui',
    filename: '[name].bundle.js',
    chunks: ['options', 'upload', 'select'],
    minChunks: function(module, count) {
      return module.resource && /@material/.test(module.resource) && count >= 2;
    }
  }),
  new webpack.optimize.CommonsChunkPlugin({
    name: 'commons',
    filename: '[name].bundle.js',
    chunks: ['background', 'options', 'upload', 'select'],
    minChunks: 2
  }),
  isProduction ? new webpack.optimize.ModuleConcatenationPlugin() : null,
  isProduction ? new MinifyPlugin() : null
];
plugins = plugins.filter(Boolean);

module.exports = {
  entry: {
    background: './src/background/background.js',
    options: './src/options/main.js',
    upload: './src/upload/main.js',
    select: './src/select/main.js',
    vue: ['vue']
  },
  output: {
    path: path.resolve(__dirname, 'dist', 'src'),
    filename: '[name]/[name].bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: 'babel-loader'
          }
        ]
      },
      {
        test: /\.vue$/,
        use: [
          {
            loader: 'vue-loader',
            options: {
              loaders: {
                scss: ExtractTextPlugin.extract({
                  use: [
                    {
                      loader: 'css-loader'
                    },
                    {
                      loader: 'sass-loader',
                      options: {
                        includePaths: [path.resolve(__dirname, 'node_modules')]
                      }
                    }
                  ]
                })
              }
            }
          }
        ]
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: 'sass-loader',
            options: {
              includePaths: [path.resolve(__dirname, 'node_modules')]
            }
          }
        ]
      }
    ]
  },
  resolve: {
    modules: [path.resolve(__dirname, 'src'), 'node_modules'],
    extensions: ['.js', '.json', '.css', '.scss', '.vue']
  },
  plugins: plugins
};
