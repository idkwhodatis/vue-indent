# vue-indent

A small VS Code extension for per-block indentation widths in Vue single-file components. Defaults: template/style **2**, script/script setup **4**.

It preserves your editor's **spaces vs tabs** choice. It adjusts indentation/tab display width while the cursor is inside a block; it does not rewrite existing whitespace or replace your formatter. With tabs, changing display width affects the entire editor, not just one block.

## Settings

- `vueIndent.templateIndentSize`: 2
- `vueIndent.styleIndentSize`: 2
- `vueIndent.scriptIndentSize`: 4

Values are integers from 1 to 32. Workspace-folder overrides are supported. The command **activate vue-indent** reapplies the current block settings.

## Behavior and limits

Vue's SFC parser handles attributed templates, TS/JS script setup, nested templates, comments and multiple style blocks. Parsed ranges are cached until the document changes. Invalid/incomplete SFC syntax temporarily restores the original width instead of guessing a block. Fixing the syntax reapplies the appropriate width.

Only Vue editors are affected. Original widths are restored when leaving a block/editor or disposing the extension. A newer manual width change is not overwritten during restoration. Spaces/tabs preferences and global editor settings are never changed. Mixed-block selections/multicursors use the original width because VS Code cannot assign different editor options to different cursors. Format-on-save tools such as Prettier retain their own configuration.

## Development

Requires Node.js 22+ for the development/package tooling.

```sh
npm ci
npm test                    # lint, strict JS typecheck, unit tests
npm run test:integration     # actual VS Code Extension Host; Linux needs a display
npm run package             # local VSIX only; does not publish
```

CI runs these gates, using Xvfb on Linux. Unit tests mock VS Code; they do not replace real Extension Host acceptance.

## License

MPL-2.0. See [LICENSE](LICENSE).
