//@ts-check
'use strict';

const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

/** @typedef {import('webpack').Configuration} WebpackConfig **/

const webviewTsRule = {
	test: /\.ts$/,
	exclude: /node_modules/,
	use: [{
		loader: 'ts-loader',
		options: {
			instance: 'webview',
			configFile: path.resolve(__dirname, 'src/webview/tsconfig.json'),
		},
	}],
};

// Force a single preact instance to avoid duplicate-copy hook context errors
// (form-js-editor ships a nested node_modules/preact).
const preactAlias = {
	preact: path.resolve(__dirname, 'node_modules/preact'),
	'preact/hooks': path.resolve(__dirname, 'node_modules/preact/hooks'),
	'preact/compat': path.resolve(__dirname, 'node_modules/preact/compat'),
	'preact/jsx-runtime': path.resolve(__dirname, 'node_modules/preact/jsx-runtime'),
};

const webviewCssRule = {
	test: /\.css$/,
	use: [MiniCssExtractPlugin.loader, 'css-loader'],
};

const webviewAssetRule = {
	test: /\.(woff2?|ttf|eot|svg|png)$/,
	type: 'asset/resource',
};

/** @type WebpackConfig */
const extensionConfig = {
	target: 'node',
	mode: 'none',
	entry: './src/extension.ts',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'extension.js',
		libraryTarget: 'commonjs2',
	},
	externals: { vscode: 'commonjs vscode' },
	resolve: { extensions: ['.ts', '.js'] },
	module: {
		rules: [{
			test: /\.ts$/,
			exclude: /node_modules/,
			use: [{ loader: 'ts-loader', options: { instance: 'extension' } }],
		}],
	},
	devtool: 'nosources-source-map',
	infrastructureLogging: { level: 'log' },
};

/** @type WebpackConfig */
const bpmnWebviewConfig = {
	target: 'web',
	mode: 'none',
	entry: './src/webview/index.ts',
	output: {
		path: path.resolve(__dirname, 'dist', 'webview'),
		filename: 'index.js',
		assetModuleFilename: 'assets/[name][ext]',
	},
	resolve: { extensions: ['.ts', '.js'], alias: preactAlias },
	module: {
		rules: [webviewTsRule, webviewCssRule, webviewAssetRule],
	},
	plugins: [new MiniCssExtractPlugin({ filename: 'index.css' })],
	devtool: 'nosources-source-map',
	infrastructureLogging: { level: 'log' },
};

/** @type WebpackConfig */
const formWebviewConfig = {
	target: 'web',
	mode: 'none',
	entry: './src/webview/form.ts',
	output: {
		path: path.resolve(__dirname, 'dist', 'webview'),
		filename: 'form.js',
		assetModuleFilename: 'assets/[name][ext]',
	},
	resolve: { extensions: ['.ts', '.js'], alias: preactAlias },
	module: {
		rules: [webviewTsRule, webviewCssRule, webviewAssetRule],
	},
	plugins: [new MiniCssExtractPlugin({ filename: 'form.css' })],
	devtool: 'nosources-source-map',
	infrastructureLogging: { level: 'log' },
};

module.exports = [extensionConfig, bpmnWebviewConfig, formWebviewConfig];
