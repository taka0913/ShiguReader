const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const outputDirectory = 'dist';

const portConfig = require('./src/config/port-config');
const {http_port, dev_express_port } = portConfig;

const fs = require('fs');

const config = {
  entry: ['babel-polyfill', './src/client/index.js'],
  output: {
    path: path.join(__dirname, outputDirectory),
    filename: 'bundle.js',
    publicPath:"/"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|woff|woff2|eot|ttf|svg)$/,
        loader: 'url-loader?limit=100000'
      },{
        test: /\.scss$/,
        use: ["style-loader", "css-loader", {
          loader: 'sass-loader',
          options: {
            implementation: require('dart-sass'),
          },
        }]
      },{
        test: /\.less$/,
        use: ["style-loader" ,"css-loader", "less-loader"]
      }
    ]
  },
  devServer: {
    port: http_port,
    open: false,
    host: '0.0.0.0',
    disableHostCheck: true,
    historyApiFallback: true,
    publicPath: "/",
    proxy: {
      '/api': `http://localhost:${dev_express_port}`
    },
    https: {
      key: fs.readFileSync('/volume1/ShiguReader/ShiguReader/src/archive/privkey.pem'),
      cert: fs.readFileSync('/volume1/ShiguReader/ShiguReader/src/archive/cert.pem'),
      ca: fs.readFileSync('/volume1/ShiguReader/ShiguReader/src/archive/chain.pem')
    }
  },
  plugins: [
    new CleanWebpackPlugin([outputDirectory]),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      favicon: './public/favicon-96x96.png'
    })
  ]
};

config.resolve = {
  alias: {
    "@common": path.resolve(__dirname, 'src/common/'),
    "@config": path.resolve(__dirname, 'src/config/'),
    "@name-parser": path.resolve(__dirname, 'src/name-parser/index'),
  }
}

module.exports = config;
