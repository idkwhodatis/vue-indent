# Vue Indent

Per-region indentation guides for Vue Single File Components: **template = 2**, **script = 4**, **style = 2** by default. Supports script setup and multiple styles using Vue's official SFC parser.

## Guides by default

`vueIndent.mode: "guides"` draws theme-aware left borders on leading whitespace. It never changes editor options, indentation detection, native Tab/Enter, formatters, or your spaces/tabs preference. Both visible split editors update on edits, scrolling, option changes, and settings changes. Closing, switching, disabling, and deactivating clears decorations.

Built-in VS Code guides may overlap these guides. Disable them yourself for Vue if desired (the extension never changes this setting):

```json
{
  "[vue]": { "editor.guides.indentation": false },
  "vueIndent.templateIndentSize": 2,
  "vueIndent.scriptIndentSize": 4,
  "vueIndent.styleIndentSize": 2
}
```

Guides mark existing leading whitespace, not syntactic nesting. A tab retains its editor-wide display width; a guide inside a tab character cannot be drawn precisely, so only boundaries at real whitespace character starts are shown. Blank lines are decorated only where whitespace exists. Mixed tag/content lines are skipped. Invalid or incomplete SFCs temporarily suppress guides and commands rather than guessing region boundaries; they recover automatically once the document parses. Valid nested template tags and multiple style blocks are supported.

## Optional explicit indent/outdent

Set `vueIndent.commandsEnabled: true`, then use **Vue Indent: Indent Selected Lines** or **Outdent Selected Lines** from the Command Palette. No default keybindings are installed, especially not Tab or Shift+Tab. You can assign your own shortcuts.

Each touched content line shifts by its region's configured width (1–32). Overlapping selections/multiple cursors edit each line once. Cross-block selections apply each block's width separately and leave wrapper/outside/inline lines alone. A selection ending at column zero excludes that final line. Tabs use the current editor tab stops and output respects `insertSpaces`; leading mixed whitespace may be normalized. Undo restores the entire command as one edit. These commands do not format or change line endings.

## Compatibility

Existing `vueIndent.templateIndentSize`, `scriptIndentSize`, and `styleIndentSize` settings continue to apply. The default intentionally changes from cursor-dependent editing to visual guides. To restore the previous behavior, explicitly set `vueIndent.mode: "legacyEditorOptions"`. That mode changes the active Vue editor's tab/indent width by cursor region, preserves spaces/tabs, and restores original options on exit/disposal. Do not enable it if preserving a fixed native Tab width is your goal. `mode: "off"` hides guides and disables legacy option changes; explicit commands remain independently controlled by `commandsEnabled`.

## Development

Node.js 22+ recommended. `npm ci`, `npm test`, `npm run test:integration` (Linux needs a display/Xvfb), `npm run package`. CI tests minimum VS Code 1.88 and stable. Unit tests cover parser boundaries, guide positions, lifecycle and range-edit planning; Extension Host tests exercise real editor options, edits and undo. `vue-indent.activate` remains as a compatible refresh command.
