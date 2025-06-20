const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: './index.web.js',
  mode: 'development',
  devServer: {
    port: 3000,
    open: true,
    hot: true
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: [
          /node_modules\/(?!(react-native|@react-native|react-native-vector-icons)\/)/,
          /node_modules\/webpack-dev-server/
        ],
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { loose: true }],
              ['@babel/preset-react', { runtime: 'automatic' }],
              '@babel/preset-typescript'
            ],
            plugins: [
              ['@babel/plugin-proposal-class-properties', { loose: true }],
              ['@babel/plugin-transform-class-properties', { loose: true }],
              ['@babel/plugin-transform-private-methods', { loose: true }],
              ['@babel/plugin-transform-private-property-in-object', { loose: true }]
            ]
          }
        }
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/,
        type: 'asset/resource'
      }
    ]
  },
  resolve: {
    alias: {
      'react-native$': 'react-native-web',
      'react-native/Libraries/Components/StaticRenderer': 'react-native-web/dist/index',
    'react-native/Libraries/EventEmitter': 'react-native-web/dist/vendor/react-native/EventEmitter',
    'react-native/Libraries/vendor': 'react-native-web/dist/vendor',
    'react-native/Libraries/Utilities': 'react-native-web/dist/exports',
    'react-native/Libraries/Utilities/Platform': 'react-native-web/dist/exports/Platform'
    },
    extensions: ['.web.js', '.web.ts', '.web.tsx', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html'
    }),
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(true),
      'process.env.NODE_ENV': JSON.stringify('development')
    })
  ]
};