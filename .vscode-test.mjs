import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'test/**/*.test.js',
	version: process.env.VSCODE_VERSION || 'stable',
	launchArgs: ['--disable-extensions', '--no-sandbox'],
});
