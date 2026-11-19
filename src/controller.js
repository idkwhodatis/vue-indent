const { regions } = require('./regions');
const { guideAnchors } = require('./guides');
const { planIndent } = require('./indent');
const { createController: createLegacyController } = require('./legacy-controller');

/** @param {typeof import('vscode')} api */
function createController(api) {
    /** @type {WeakMap<import('vscode').TextDocument, {version:number, source:string, ranges:ReturnType<typeof regions>}>} */
    const cache = new WeakMap();
    const decoration = api.window.createTextEditorDecorationType({
        borderWidth: '0 0 0 1px', borderStyle: 'solid',
        borderColor: new api.ThemeColor('editorIndentGuide.background1'),
        rangeBehavior: api.DecorationRangeBehavior.ClosedClosed
    });
    /** @type {Set<import('vscode').TextEditor>} */
    const decorated = new Set();
    let disposed = false;
    /** @type {ReturnType<typeof createLegacyController> | undefined} */
    let legacy;

    /** @param {import('vscode').TextDocument} doc */
    function parsed(doc) {
        let entry = cache.get(doc);
        if (!entry || entry.version !== doc.version) {
            const source = doc.getText();
            entry = { version: doc.version, source, ranges: regions(source) };
            cache.set(doc, entry);
        }
        return entry;
    }
    /** @param {import('vscode').TextDocument} doc */
    function configFor(doc) { return api.workspace.getConfiguration('vueIndent', doc.uri); }
    /** @param {import('vscode').WorkspaceConfiguration} config */
    function widthsFor(config) {
        /** @type {{template:number,script:number,style:number}} */
        const widths = {template:2,script:4,style:2};
        for (const kind of /** @type {const} */ (['template', 'script', 'style'])) {
            const size = config.get(`${kind}IndentSize`, kind === 'script' ? 4 : 2);
            widths[kind] = Number.isInteger(size) && size >= 1 && size <= 32 ? size : (kind === 'script' ? 4 : 2);
        }
        return widths;
    }
    /** @param {import('vscode').TextEditor} editor */
    function tabWidth(editor) {
        const size = Number(editor.options.tabSize);
        return Number.isInteger(size) && size > 0 ? size : 4;
    }
    function render() {
        if (disposed) return;
        const active = api.window.activeTextEditor;
        const wantsLegacy = active?.document.languageId === 'vue' && configFor(active.document).get('mode', /** @type {string} */ ('guides')) === 'legacyEditorOptions';
        if (!wantsLegacy && legacy) { legacy.dispose(); legacy = undefined; }
        if (wantsLegacy && !legacy) legacy = createLegacyController(api);
        const visible = new Set(api.window.visibleTextEditors);
        for (const editor of decorated) {
            if (!visible.has(editor)) { editor.setDecorations(decoration, []); decorated.delete(editor); }
        }
        for (const editor of visible) {
            const doc = editor.document;
            if (doc.isClosed || doc.languageId !== 'vue' || configFor(doc).get('mode', /** @type {string} */ ('guides')) !== 'guides') {
                editor.setDecorations(decoration, []); decorated.delete(editor); continue;
            }
            const data = parsed(doc);
            const anchors = guideAnchors(data.source, data.ranges, widthsFor(configFor(doc)), tabWidth(editor));
            // Only decorate visible lines; parsing is cached by document version.
            const ranges = anchors.filter(point => editor.visibleRanges.some(range => point.line >= range.start.line && point.line <= range.end.line))
                .map(point => new api.Range(point.line, point.character, point.line, point.character + 1));
            editor.setDecorations(decoration, ranges);
            decorated.add(editor);
        }
    }
    /** @param {boolean} outdent */
    async function indent(outdent) {
        const editor = api.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'vue' || editor.document.isClosed) return false;
        const config = configFor(editor.document);
        if (!config.get('commandsEnabled', false)) {
            api.window.showInformationMessage('Enable vueIndent.commandsEnabled to use Vue Indent range commands. Native Tab/Enter are unchanged.');
            return false;
        }
        const doc = editor.document;
        const data = parsed(doc);
        const selections = editor.selections.map(selection => ({ start: doc.offsetAt(selection.start), end: doc.offsetAt(selection.end) }));
        const edits = planIndent(data.source, data.ranges, selections, widthsFor(config), tabWidth(editor), editor.options.insertSpaces !== false, outdent);
        if (!edits.length) return false;
        return editor.edit(builder => {
            for (const edit of edits) builder.replace(new api.Range(doc.positionAt(edit.start), doc.positionAt(edit.end)), edit.text);
        }, { undoStopBefore: true, undoStopAfter: true });
    }
    const subscriptions = [
        api.window.onDidChangeVisibleTextEditors(render),
        api.window.onDidChangeActiveTextEditor(render),
        api.window.onDidChangeTextEditorVisibleRanges(render),
        api.window.onDidChangeTextEditorOptions(render),
        api.workspace.onDidChangeTextDocument(render),
        api.workspace.onDidOpenTextDocument(render),
        api.workspace.onDidCloseTextDocument(doc => { cache.delete(doc); render(); }),
        api.workspace.onDidChangeConfiguration(event => { if (event.affectsConfiguration('vueIndent')) render(); }),
        api.commands.registerCommand('vue-indent.activate', render),
        api.commands.registerCommand('vue-indent.indent', () => indent(false)),
        api.commands.registerCommand('vue-indent.outdent', () => indent(true))
    ];
    render();
    return { dispose() {
        if (disposed) return;
        disposed = true;
        subscriptions.forEach(subscription => subscription.dispose());
        legacy?.dispose();
        for (const editor of decorated) editor.setDecorations(decoration, []);
        decorated.clear(); decoration.dispose();
    } };
}
module.exports = { createController };
