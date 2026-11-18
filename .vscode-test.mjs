import { defineConfig } from '@vscode/test-cli';
export default defineConfig({ version: process.env.VSCODE_VERSION || 'stable', files: 'test/extension.test.js', launchArgs: ['--disable-extensions', '--no-sandbox'] });
