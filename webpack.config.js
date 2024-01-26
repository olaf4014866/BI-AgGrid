var HtmlWebpackPlugin = require('html-webpack-plugin');
var LiveReloadPlugin = require('webpack-livereload-plugin');
module.exports = {
    mode: 'development',
    entry: { 'index': './Client/dashboard.js', 'dashboard': './Client/index.js' },
    output: {
        path: __dirname,
        filename: "apps/[name]/build/bundle.js"
    },
    module: {
        rules: [{
                use: 'babel-loader',
                test: /\.js$/,
                exclude: /node_modules/
            },
            {
                use: ['style-loader', 'css-loader'],
                test: /\.css$/
            },
            {
                test: /\.scss$/,
                use: [{
                    loader: "style-loader"
                }, {
                    loader: "css-loader",
                    options: {
                        sourceMap: true
                    }
                }, {
                    loader: "sass-loader",
                    options: {
                        sourceMap: true
                    }
                }]
            }
        ]
    },

    plugins: [
        new HtmlWebpackPlugin({
            template: 'Client/index.html',
            filename: 'index.html',
            chunks: 'index'
        }),
        new HtmlWebpackPlugin({
            template: 'Client/dashboard.html',
            filename: 'dashboard.html',
            chunks: 'dashboard'
        }),
        new LiveReloadPlugin()
    ]
};