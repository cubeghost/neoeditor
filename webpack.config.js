require('dotenv').config();

const os = require('os');
const path = require('path');
const webpack = require('webpack');
const findCacheDir = require('find-cache-dir');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin');
const SimpleProgressWebpackPlugin = require('simple-progress-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const HappyPack = require('happypack');
const history = require('connect-history-api-fallback');
const convert = require('koa-connect');

const CI = !!process.env.CI;
const PROD = process.env.NODE_ENV === 'production';
/* eslint-disable new-cap */
const happyThreadPool = HappyPack.ThreadPool({
  size: CI ? 1 : os.cpus().length,
  debug: CI,
});

const paths = {
  build: path.resolve(__dirname, './build'),
  html: path.resolve(__dirname, './src/html/index.html'),
  src: path.resolve(__dirname, './src'),
  nodeModules: path.resolve(__dirname, './node_modules'),
};

const entry = PROD
  ? { client: path.join(paths.src, 'index.js') }
  : ['webpack-hot-client/client', path.join(paths.src, 'index.js')];

const config = {
  mode: 'development',
  devtool: 'cheap-module-eval-source-map',
  entry: entry,
  serve: {
    hot: true,
    dev: {
      logLevel: 'silent',
    },
    port: 8000,
    logLevel: 'silent',
    content: [
      path.resolve(paths.nodeModules, 'sass.js/dist')
    ],
    add: (app, middleware, options) => {
      app.use(convert(history()));
    },
  },
  output: {
    path: paths.build,
    pathinfo: true,
    filename: '[name].[hash:8].js',
    sourceMapFilename: '[name].[hash:8].js.map',
    publicPath: '/',
  },
  node: {
    fs: 'empty',
  },
  optimization: {
    namedModules: true,
    concatenateModules: true,
  },
  resolve: {
    modules: [paths.src, paths.nodeModules],
    extensions: ['.js', '.jsx', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        exclude: [/node_modules/],
        include: [paths.src],
        use: ['happypack/loader?id=eslint'],
      },
      {
        test: /\.jsx?$/,
        include: [paths.src],
        use: ['happypack/loader?id=babel'],
      },
      {
        test: /\.s?css$/,
        use: (() => {
          const loaders = ['happypack/loader?id=sass'];
          if (PROD) {
            loaders.unshift(MiniCssExtractPlugin.loader);
          }
          return loaders;
        })(),
      },
      {
        test: /\.(jpg|png|gif|eot|svg|ttf|otf|woff|woff2)$/,
        include: [paths.src],
        loader: 'file-loader',
      },
    ],
  },
  plugins: [
    new HappyPack({
      id: 'babel',
      threadPool: happyThreadPool,
      verbose: false,
      debug: false,
      loaders: [
        {
          loader: 'babel-loader',
          query: {
            cacheDirectory: findCacheDir({
              name: 'neoeditor-happypack-cache',
            }),
          },
        },
      ],
    }),
    new HappyPack({
      id: 'eslint',
      threadPool: happyThreadPool,
      verbose: false,
      debug: false,
      loaders: [
        {
          loader: 'eslint-loader',
          options: {
            configFile: path.join(__dirname, 'eslint.js'),
            useEslintrc: false,
            cache: false,
            formatter: require('eslint-formatter-pretty'),
          },
        },
      ],
    }),
    new HappyPack({
      id: 'sass',
      threadPool: happyThreadPool,
      verbose: false,
      debug: false,
      loaders: (() => {
        const loaders = [
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
              minimize: PROD,
              localIdentName: PROD ? '[hash:5]' : '[path][hash:5]',
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: true,
              config: {
                path: path.resolve(__dirname, './postcss.config.js'),
              },
            },
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true,
              includePaths: [
                paths.src,
                paths.nodeModules,
                path.resolve(paths.src, './scss'),
                path.resolve(paths.src, './assets'),
              ],
              outputStyle: PROD ? 'compressed' : 'expanded',
            },
          },
        ];
        if (!PROD) {
          loaders.unshift({
            loader: 'style-loader',
            options: {
              sourceMap: true,
              singleton: false,
            },
          });
        }
        return loaders;
      })(),
    }),
    new HtmlWebpackPlugin({
      inject: true,
      template: paths.html,
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      },
    }),
    new webpack.EnvironmentPlugin(['NODE_ENV']),
    new SimpleProgressWebpackPlugin({
      format: 'compact',
    }),
    new FriendlyErrorsWebpackPlugin(),
  ],
};

if (process.env.NODE_ENV === 'production') {
  config.mode = 'production';
  config.devtool = 'source-map';
  config.optimization = {
    splitChunks: {
      cacheGroups: {
        commons: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  };

  config.plugins.push(
    new UglifyJsPlugin({
      sourceMap: true,
      parallel: true,
      uglifyOptions: {
        ie8: false,
        ecma: 7,
        warnings: true,
        output: {
          comments: false,
        },
      },
    })
  );
  config.plugins.push(
    new MiniCssExtractPlugin({
      filename: '[name].[hash:8].css',
    })
  );
}

module.exports = config;
