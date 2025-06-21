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
        exclude: /node_modules\/(?!(react-native|@react-native|@react-navigation|react-native-vector-icons)\/)/,
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
      
      // Ultra aggressive server package blocking
      'firebase-admin': path.resolve(__dirname, 'src/stubs/empty.js'),
      '@google-cloud/storage': path.resolve(__dirname, 'src/stubs/empty.js'),
      '@google-cloud/logging': path.resolve(__dirname, 'src/stubs/empty.js'),
      'google-auth-library': path.resolve(__dirname, 'src/stubs/empty.js'),
      'google-logging-utils': path.resolve(__dirname, 'src/stubs/empty.js'),
      'gcp-metadata': path.resolve(__dirname, 'src/stubs/empty.js'),
      'teeny-request': path.resolve(__dirname, 'src/stubs/empty.js'),
      'retry-request': path.resolve(__dirname, 'src/stubs/empty.js'),
      'jws': path.resolve(__dirname, 'src/stubs/empty.js'),
      '@fastify/busboy': path.resolve(__dirname, 'src/stubs/empty.js'),
      
      // Block all your services that import server packages
      './services/firebase/database.service': path.resolve(__dirname, 'src/stubs/empty.js'),
      '../services/firebase/database.service': path.resolve(__dirname, 'src/stubs/empty.js'),
      '@/services/firebase/database.service': path.resolve(__dirname, 'src/stubs/empty.js'),
      './services/user-progression.service': path.resolve(__dirname, 'src/stubs/empty.js'),
      '../services/user-progression.service': path.resolve(__dirname, 'src/stubs/empty.js'),
      '@/services/user-progression.service': path.resolve(__dirname, 'src/stubs/empty.js'),
      './firebase/auth.service': path.resolve(__dirname, 'src/stubs/empty.js'),
      '../firebase/auth.service': path.resolve(__dirname, 'src/stubs/empty.js'),
      '@/services/firebase/auth.service': path.resolve(__dirname, 'src/stubs/empty.js'),
      
      // Block problematic config
      './config/firebase.config': path.resolve(__dirname, 'src/stubs/empty.js'),
      '../config/firebase.config': path.resolve(__dirname, 'src/stubs/empty.js'),
      '@/config/firebase.config': path.resolve(__dirname, 'src/stubs/empty.js'),
      
      // Use stubs for React Native packages
      'react-native-gesture-handler': path.resolve(__dirname, 'src/components/stubs/index.web.js'),
      'react-native-reanimated': path.resolve(__dirname, 'src/components/stubs/index.web.js'),
      'react-native-linear-gradient': path.resolve(__dirname, 'src/components/stubs/index.web.js'),
      'react-native-vector-icons/Ionicons': path.resolve(__dirname, 'src/components/stubs/index.web.js'),
      'lottie-react-native': path.resolve(__dirname, 'src/components/stubs/index.web.js'),
      '@lottiefiles/dotlottie-react': path.resolve(__dirname, 'src/stubs/empty.js'),
      
      // Handle node: protocol
      'node:events': 'events',
      'node:process': 'process/browser',
      'node:stream': 'stream-browserify',
      'node:util': 'util',
      'node:crypto': 'crypto-browserify',
      'node:fs': path.resolve(__dirname, 'src/stubs/empty.js'),
      'node:path': 'path-browserify',
      'node:net': path.resolve(__dirname, 'src/stubs/empty.js'),
      'node:tls': path.resolve(__dirname, 'src/stubs/empty.js'),
      'node:http': path.resolve(__dirname, 'src/stubs/empty.js'),
      'node:https': path.resolve(__dirname, 'src/stubs/empty.js'),
      'node:zlib': 'browserify-zlib',
    },
    fallback: {
      "events": require.resolve("events/"),
      "stream": require.resolve("stream-browserify"),
      "util": require.resolve("util/"),
      "buffer": require.resolve("buffer/"),
      "process": require.resolve("process/browser"),
      "crypto": require.resolve("crypto-browserify"),
      "path": require.resolve("path-browserify"),
      "zlib": require.resolve("browserify-zlib"),
      "os": require.resolve("os-browserify/browser"),
      "fs": false,
      "net": false,
      "tls": false,
      "child_process": false,
      "http": false,
      "https": false,
    },
    extensions: ['.web.js', '.web.ts', '.web.tsx', '.js', '.jsx', '.ts', '.tsx', '.json'],
    mainFields: ['browser', 'module', 'main'],
    symlinks: false,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html'
    }),
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(true),
      'process.env.NODE_ENV': JSON.stringify('development'),
      global: 'globalThis',
      exports: '{}',
      module: '{}',
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
    // Block everything with multiple strategies
    new webpack.IgnorePlugin({
      resourceRegExp: /^(firebase-admin|@google-cloud|@langchain|langchain|graphql-yoga|@apollo\/server|google-auth-library|google-logging-utils|gcp-metadata|teeny-request|retry-request|jws|@fastify\/busboy)$/,
    }),
    new webpack.IgnorePlugin({
      checkResource(resource, context) {
        const serverPackages = [
          'firebase-admin',
          '@google-cloud',
          'google-auth-library', 
          'google-logging-utils',
          'gcp-metadata',
          'teeny-request',
          'retry-request',
          'jws',
          '@fastify/busboy',
          '@langchain',
          'langchain', 
          'graphql-yoga',
          '@apollo/server'
        ];
        
        // Block any resource that contains these patterns
        const shouldIgnore = serverPackages.some(pkg => 
          resource.includes(pkg) || 
          (context && context.includes(pkg))
        );
        
        if (shouldIgnore) {
          console.log(`🚫 Webpack ignoring: ${resource} from ${context}`);
        }
        
        return shouldIgnore;
      }
    }),
  ]
};