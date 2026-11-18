const { regions } = require('./regions');

/** @param {typeof import('vscode')} api */
function createController(api) {
    /** @type {Map<import('vscode').TextEditor, { original: import('vscode').TextEditorOptions, applied: import('vscode').TextEditorOptions }>} */
    const states = new Map();
    /** @type {WeakMap<import('vscode').TextDocument, {version: number, ranges: ReturnType<typeof regions>}>} */
    const cache = new WeakMap();
    let disposed = false;

    /** @param {import('vscode').TextEditor} editor */
    function restore(editor) {
        const state = states.get(editor);
        if (!state) return;
        // Do not overwrite a newer manual/editor configuration change.
        /** @type {import('vscode').TextEditorOptions} */
        const options = {};
        for (const key of /** @type {const} */ (['tabSize', 'indentSize'])) {
            if (editor.options[key] === state.applied[key]) options[key] = state.original[key];
        }
        states.delete(editor);
        if (Object.keys(options).length) editor.options = options;
    }

    function update() {
        if (disposed) return;
        const editor = api.window.activeTextEditor;
        for (const previous of states.keys()) if (previous !== editor) restore(previous);
        if (!editor) return;
        const doc = editor.document;
        if (doc.languageId !== 'vue' || doc.isClosed) { restore(editor); return; }
        let entry = cache.get(doc);
        if (!entry || entry.version !== doc.version) {
            entry = { version: doc.version, ranges: regions(doc.getText()) };
            cache.set(doc, entry);
        }
        // Editor options are global to the document: mixed-block multicursors
        // cannot safely receive different settings, so leave the original values.
        const selected = editor.selections.map(selection => {
            const start = doc.offsetAt(selection.start);
            const end = doc.offsetAt(selection.end);
            return entry.ranges.find(range => start >= range.start && end <= range.end);
        });
        const region = selected[0];
        if (!region || selected.some(other => !other || other.kind !== region.kind)) { restore(editor); return; }
        const config = api.workspace.getConfiguration('vueIndent', doc.uri);
        const fallback = region.kind === 'script' ? 4 : 2;
        const size = config.get(`${region.kind}IndentSize`, fallback);
        if (!Number.isInteger(size) || size < 1 || size > 32) { restore(editor); return; }
        let state = states.get(editor);
        if (!state) {
            state = { original: { tabSize: editor.options.tabSize, indentSize: editor.options.indentSize }, applied: {} };
            states.set(editor, state);
        } else {
            for (const key of /** @type {const} */ (['tabSize', 'indentSize'])) {
                if (editor.options[key] !== state.applied[key]) state.original[key] = editor.options[key];
            }
        }
        state.applied = { tabSize: size, indentSize: size };
        if (editor.options.tabSize !== size || editor.options.indentSize !== size) editor.options = state.applied;
    }

    const subscriptions = [
        api.window.onDidChangeTextEditorSelection(event => { if (event.textEditor === api.window.activeTextEditor) update(); }),
        api.window.onDidChangeActiveTextEditor(update),
        api.workspace.onDidChangeTextDocument(event => { if (event.document === api.window.activeTextEditor?.document) update(); }),
        api.workspace.onDidChangeConfiguration(event => {
            const editor = api.window.activeTextEditor;
            if (editor && event.affectsConfiguration('vueIndent', editor.document.uri)) update();
        }),
        api.workspace.onDidOpenTextDocument(() => update()),
        api.workspace.onDidCloseTextDocument(doc => {
            cache.delete(doc);
            for (const editor of states.keys()) if (editor.document === doc) restore(editor);
        }),
        api.commands.registerCommand('vue-indent.activate', update)
    ];
    update();
    return { dispose() {
        if (disposed) return;
        disposed = true;
        subscriptions.forEach(subscription => subscription.dispose());
        for (const editor of states.keys()) restore(editor);
    } };
}
module.exports = { createController };
