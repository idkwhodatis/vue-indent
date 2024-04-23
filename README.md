# vue-indent
[Github Repo]()  
This is a simple extension that dynamically adjust indentation size differently inside `<template>`,`<style>`, and `<script>` for `.vue` files.

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
