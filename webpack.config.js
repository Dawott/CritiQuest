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
    'react-native/Libraries/Utilities/Platform': 'react-native-web/dist/exports/Platform',
    '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@screens': path.resolve(__dirname, 'src/screens'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@utils': path.resolve(__dirname, 'src/utils'),

      'node:util': require.resolve('util/'),
      'node:crypto': require.resolve('crypto-browserify'),
      'node:stream': require.resolve('stream-browserify'),
      'node:buffer': require.resolve('buffer'),
      'node:process': require.resolve('process/browser'),
      'node:os': require.resolve('os-browserify/browser'),
      'node:path': require.resolve('path-browserify'),
      'node:events': require.resolve('events'),
      'node:url': require.resolve('url'),
      'node:querystring': require.resolve('querystring'),
      'node:assert': require.resolve('assert'),
    },
    extensions: ['.web.js', '.web.ts', '.web.tsx', '.js', '.jsx', '.ts', '.tsx', '.json'],
    fallback: {
     "util": require.resolve("util/"),
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"), 
      "buffer": require.resolve("buffer"),
      "process": require.resolve("process/browser"),
      "os": require.resolve("os-browserify/browser"),
      "path": require.resolve("path-browserify"),
      "events": require.resolve("events"),
      "url": require.resolve("url"),
      "querystring": require.resolve("querystring"),
      "assert": require.resolve("assert"),
      "fs": false,
      "net": false,
      "tls": false,
      "child_process": false,
      "http": false,
      "https": false,
      "http2": false,
      "zlib": false,
      "constants": false,
      "vm": false
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html'
    }),
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(true),
      'process.env.NODE_ENV': JSON.stringify('development')
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
    new webpack.ContextReplacementPlugin(
      /\/firebase\/lib\/app\/firebase-namespace/,
      (data) => {
        delete data.dependencies[0].critical;
        return data;
      }
    )
  ]
};