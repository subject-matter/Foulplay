import shopify from 'vite-plugin-shopify'
import { resolve } from 'node:path'
import cssnano from 'cssnano'
import advancedPreset from 'cssnano-preset-advanced'

export default {
	css: {
		transformer: 'postcss',
		postcss: {
			plugins: [
				cssnano(
					advancedPreset({
						autoprefix: false,
						mergeRules: true,
						discardDuplicates: true,
						reduceIdents: false,
						zindex: false,
					})
				),
			],
		},
	},
	server: {
		secure: false,
		host: 'localhost',
		https: false,
		port: 3000,
	},
	publicDir: 'public',
	resolve: {
		alias: {
			'@js': resolve('src/scripts'),
			'@scss': resolve('src/styles'),
		},
	},
	plugins: [
		shopify({
			themeRoot: './',
			sourceCodeDir: 'src',
			entrypointsDir: 'src/entry',
			additionalEntrypoints: [],
			snippetFile: 'vite.liquid',
			versionNumbers: true,
		}),
	],
	build: {
		sourcemap: true,
		minify: 'esbuild',
		cssMinify: 'postcss',
		rollupOptions: {
			output: {
				output: {
					manualChunks: {
						'core-chunk': (id) => id.includes('/src/core/'),
						'theme-chunk': (id) => id.includes('/src/theme/'),
						'catalog-chunk': (id) => id.includes('/src/catalog/'),
						'product-chunk': (id) => id.includes('/src/product/'),
						'cart-chunk': (id) => id.includes('/src/cart/'),
						'customer-chunk': (id) => id.includes('/src/customer/'),
					},
				},
			},
		},
	},
}
