import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		appDir: 'app',
		adapter: adapter({
			fallback: '404.html'
		}),
		paths: {
			base: process.argv.includes('dev') || process.env.NODE_ENV === 'development' ? '' : process.env.BASE_PATH || ''
		},
		prerender: process.env.ORIGIN ? { origin: process.env.ORIGIN.toLowerCase() } : undefined
	}
};

export default config;
