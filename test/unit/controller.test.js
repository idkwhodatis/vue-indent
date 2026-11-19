const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createController } = require('../../src/controller');

function setup(initialSettings = {}, languageId = 'vue') {
    const listeners = new Map(); const commands = new Map(); const messages = []; const scopes = [];
    const settings = { templateIndentSize: 2, scriptIndentSize: 4, styleIndentSize: 2, ...initialSettings };
    let reads = 0; let writes = 0; let decorationDisposed = 0; let renderOptions;
    let source = '<template>\n    <p>hello</p>\n</template>\n<script>\n        const x = 1;\n</script>';
    const doc = { languageId, version: 1, isClosed: false, uri: { path: '/component.vue' },
        getText() { reads++; return source; },
        offsetAt(position) { return source.split('\n').slice(0, position.line).reduce((sum, line) => sum + line.length + 1, 0) + position.character; },
        positionAt(offset) { const before = source.slice(0, offset).split('\n'); return { line: before.length - 1, character: before[before.length - 1].length }; }
    };
    class Range {
        constructor(a, b, c, d) { if (typeof a === 'number') { this.start = { line: a, character: b }; this.end = { line: c, character: d }; } else { this.start = a; this.end = b; } }
    }
    const editor = { document: doc, selections: [new Range(1, 4, 1, 4)], visibleRanges: [new Range(0, 0, 5, 0)], decorations: [], edits: [],
        setDecorations(type, ranges) { this.decorations = ranges; },
        edit(callback, options) { const edits = []; callback({ replace(range, text) { edits.push({ range, text }); } }); this.edits.push({ edits, options }); return Promise.resolve(true); }
    };
    let options = { tabSize: 8, indentSize: 8, insertSpaces: true };
    Object.defineProperty(editor, 'options', { get: () => options, set: value => { writes++; options = { ...options, ...value }; } });
    const on = name => fn => { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); return { dispose() { listeners.get(name).delete(fn); } }; };
    const api = {
        Range, ThemeColor: class { constructor(id) { this.id = id; } }, DecorationRangeBehavior: { ClosedClosed: 1 },
        window: { activeTextEditor: editor, visibleTextEditors: [editor],
            createTextEditorDecorationType(value) { renderOptions = value; return { dispose() { decorationDisposed++; } }; },
            showInformationMessage(message) { messages.push(message); return Promise.resolve(undefined); },
            onDidChangeTextEditorSelection: on('selection'), onDidChangeVisibleTextEditors: on('visible'), onDidChangeActiveTextEditor: on('active'),
            onDidChangeTextEditorVisibleRanges: on('scroll'), onDidChangeTextEditorOptions: on('options') },
        workspace: { getConfiguration(name, uri) { scopes.push(uri); return { get(key, fallback) { return settings[key] ?? fallback; } }; },
            onDidChangeTextDocument: on('change'), onDidOpenTextDocument: on('open'), onDidCloseTextDocument: on('close'), onDidChangeConfiguration: on('config') },
        commands: { registerCommand(name, callback) { assert.ok(!commands.has(name)); commands.set(name, callback); return { dispose() { commands.delete(name); } }; } }
    };
    const controller = createController(api);
    return { api, editor, doc, settings, messages, scopes, commands, controller, Range,
        get reads() { return reads; }, get writes() { return writes; }, get decorationDisposed() { return decorationDisposed; }, get renderOptions() { return renderOptions; },
        emit(name, event) { for (const callback of [...(listeners.get(name) || [])]) callback(event); },
        setText(text) { source = text; doc.version++; this.emit('change', { document: doc }); },
        subscriberCount() { return [...listeners.values()].reduce((sum, set) => sum + set.size, 0); }
    };
}

test('default guides render per-block anchors without options or text mutations', () => {
    const s = setup();
    assert.equal(s.writes, 0); assert.equal(s.editor.edits.length, 0);
    assert.deepEqual(s.editor.decorations.map(range => range.start), [{ line: 1, character: 0 }, { line: 1, character: 2 }, { line: 4, character: 0 }, { line: 4, character: 4 }]);
    assert.ok(s.scopes.every(uri => uri === s.doc.uri));
    assert.equal(s.renderOptions.borderWidth, '0 0 0 1px');
    s.controller.dispose(); assert.equal(s.writes, 0);
});
test('only visible lines decorated and scrolling reuses parse cache', () => {
    const s = setup(); s.editor.visibleRanges = [new s.Range(4, 0, 4, 20)]; s.emit('scroll');
    assert.equal(s.reads, 1); assert.ok(s.editor.decorations.every(range => range.start.line === 4));
});
test('edits invalidate cache and malformed source removes guides', () => {
    const s = setup(); s.setText('<template>\n    <div>');
    assert.equal(s.reads, 2); assert.deepEqual(s.editor.decorations, []); assert.equal(s.writes, 0);
});
test('non-Vue editors never decorated or mutated', () => {
    const s = setup({}, 'html'); assert.equal(s.reads, 0); assert.deepEqual(s.editor.decorations, []); assert.equal(s.writes, 0);
});
test('hidden editor cleared; becoming visible restores guides', () => {
    const s = setup(); s.api.window.visibleTextEditors = []; s.emit('visible'); assert.deepEqual(s.editor.decorations, []);
    s.api.window.visibleTextEditors = [s.editor]; s.emit('visible'); assert.equal(s.editor.decorations.length, 4); assert.equal(s.reads, 1);
});
test('configuration updates guide spacing but never editor options', () => {
    const s = setup(); s.settings.templateIndentSize = 3; s.emit('config', { affectsConfiguration: name => name === 'vueIndent' });
    assert.deepEqual(s.editor.decorations.filter(range => range.start.line === 1).map(range => range.start.character), [0, 3]); assert.equal(s.writes, 0);
});
test('commands disabled by default; no edits and native typing untouched', async () => {
    const s = setup(); assert.equal(await s.commands.get('vue-indent.indent')(), false); assert.equal(await s.commands.get('vue-indent.outdent')(), false);
    assert.equal(s.editor.edits.length, 0); assert.equal(s.messages.length, 2); assert.equal(s.writes, 0);
    assert.deepEqual([...s.commands.keys()].sort(), ['vue-indent.activate', 'vue-indent.indent', 'vue-indent.outdent'].sort());
});
test('enabled command creates one undoable edit batch with block-specific width', async () => {
    const s = setup({ commandsEnabled: true });
    s.editor.selections = [new s.Range(1, 4, 4, 10)];
    assert.equal(await s.commands.get('vue-indent.indent')(), true); assert.equal(s.editor.edits.length, 1);
    const batch = s.editor.edits[0]; assert.deepEqual(batch.options, { undoStopBefore: true, undoStopAfter: true });
    assert.deepEqual(batch.edits.map(edit => edit.text.length), [6, 12]); assert.equal(s.writes, 0);
});
test('enabled outdent respects fixed editor tab width and tabs preference', async () => {
    const s = setup({ commandsEnabled: true }); s.editor.options = { insertSpaces: false, tabSize: 4 };
    s.editor.selections = [new s.Range(4, 8, 4, 8)];
    assert.equal(await s.commands.get('vue-indent.outdent')(), true); assert.equal(s.editor.edits[0].edits[0].text, '\t');
    assert.equal(s.writes, 1); // Only the explicit simulated user option update.
});
test('commands reject no editor, closed document and other languages', async () => {
    const s = setup({ commandsEnabled: true }); const command = s.commands.get('vue-indent.indent');
    s.doc.languageId = 'html'; assert.equal(await command(), false); s.doc.languageId = 'vue'; s.doc.isClosed = true; assert.equal(await command(), false);
    s.api.window.activeTextEditor = undefined; assert.equal(await command(), false); assert.equal(s.editor.edits.length, 0);
});
test('close/language transition clears decorations and reopening Vue regenerates', () => {
    const s = setup(); s.doc.isClosed = true; s.emit('close', s.doc); assert.deepEqual(s.editor.decorations, []);
    s.doc.isClosed = false; s.doc.languageId = 'html'; s.emit('open', s.doc); assert.deepEqual(s.editor.decorations, []);
    s.doc.languageId = 'vue'; s.emit('open', s.doc); assert.equal(s.editor.decorations.length, 4); assert.equal(s.writes, 0);
});
test('legacy opt-in mutates options only while active, switching back restores', () => {
    const s = setup({ mode: 'legacyEditorOptions' }); assert.equal(s.editor.options.tabSize, 2); assert.deepEqual(s.editor.decorations, []);
    s.settings.mode = 'guides'; s.emit('config', { affectsConfiguration: () => true });
    assert.equal(s.editor.options.tabSize, 8); assert.equal(s.editor.options.indentSize, 8); assert.equal(s.editor.decorations.length, 4);
    s.controller.dispose(); assert.equal(s.editor.options.tabSize, 8);
});
test('disposal clears decorations and listeners exactly once', () => {
    const s = setup(); s.controller.dispose(); s.controller.dispose();
    assert.deepEqual(s.editor.decorations, []); assert.equal(s.decorationDisposed, 1); assert.equal(s.commands.size, 0); assert.equal(s.subscriberCount(), 0); assert.equal(s.writes, 0);
});
test('guides use nonempty character ranges instead of collapsed decoration ranges', () => {
    const s = setup(); assert.ok(s.editor.decorations.every(range => range.start.line === range.end.line && range.end.character === range.start.character + 1));
});
test('legacy restores on editor loss and can be reentered without leaking listeners', () => {
    const s = setup({ mode: 'legacyEditorOptions' });
    const initialCount = s.subscriberCount();
    s.api.window.activeTextEditor = undefined; s.emit('active'); assert.equal(s.editor.options.tabSize, 8);
    s.api.window.activeTextEditor = s.editor; s.emit('active'); assert.equal(s.editor.options.tabSize, 2); assert.equal(s.subscriberCount(), initialCount);
    s.controller.dispose(); assert.equal(s.editor.options.tabSize, 8); assert.equal(s.subscriberCount(), 0);
});
