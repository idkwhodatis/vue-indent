# vue-indent
[Github Repo](https://github.com/idkwhodatis/vue-indent)  
This is a simple extension that dynamically adjust indentation size differently inside `<template>`, `<style>`, and `<script>` for `.vue` files.

## Warning
Note that this extension would store original editor.options and modify:
- `editor.options.detectIndentation` to false
- `editor.options.insertSpaces` to false
- `editor.options.tabSize`  
when deactivated, these values would be restored to original.

## Extension Settings
- `vueIndent.templateIndentSize`: default set to 2 spaces
- `vueIndent.styleIndentSize`: default set to 2 spaces
- `vueIndent.scriptIndentSize`: default set to 4 spaces

## Release Notes
### 1.0.0
Initial release of vue-indent

## Development

Use Node.js 24 LTS (`nvm use`); the upgraded ESLint/test/packaging tools no longer support Node.js 18. This development requirement does not change the extension's VS Code minimum of 1.88. `@types/vscode` is pinned to 1.88.0 and Node typings stay on the latest 18.x release so type declarations do not silently permit newer Extension Host APIs.

Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run package`. Extension Host tests need a graphical display (on Linux, `xvfb-run -a npm test`). `typecheck` preserves the repository's existing `checkJs: false`; it is not a strict correctness check, and the existing test suite is only a sample smoke test. The missing/untracked `logo.png` manifest reference was removed so packaging is reproducible from a clean checkout.
