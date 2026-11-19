const assert = require('assert');
const vscode = require('vscode');
const { createController } = require('../src/controller');

suite('Vue guides and commands integration', () => {
    let controller;
    setup(async () => {
        await vscode.extensions.getExtension('idkwhodatis.vue-indent').activate();
        require('../extension').deactivate();
    });
    teardown(async () => {
        controller?.dispose(); controller = undefined;
        await vscode.workspace.getConfiguration('vueIndent').update('commandsEnabled', undefined, vscode.ConfigurationTarget.Global);
    });
    test('guides preserve native options across Vue blocks and editor switches', async () => {
        const doc = await vscode.workspace.openTextDocument({ language: 'vue', content: '<template>\n  <div/>\n</template>\n<script>\n    const x=1\n</script>' });
        const editor = await vscode.window.showTextDocument(doc);
        assert.equal(doc.languageId, 'vue');
        editor.options = { tabSize: 8, indentSize: 8, insertSpaces: true };
        controller = createController(vscode);
        for (const line of [1,4]) {
            editor.selection = new vscode.Selection(line, 0, line, 0);
            await vscode.commands.executeCommand('vue-indent.activate');
            assert.equal(editor.options.tabSize, 8);
            assert.equal(editor.options.indentSize, 8);
            assert.equal(editor.options.insertSpaces, true);
        }
        const html = await vscode.workspace.openTextDocument({ language: 'html', content: '<div/>' });
        const other = await vscode.window.showTextDocument(html);
        other.options = { tabSize: 3, insertSpaces: false };
        await vscode.commands.executeCommand('vue-indent.activate');
        assert.equal(other.options.tabSize, 3);
        controller.dispose();
        assert.equal(editor.options.tabSize, 8);
    });
    test('explicit multicursor commands edit per region once, track selections and undo', async () => {
        const original = '<template>\n  <div/>\n</template>\n<script>\n    const x=1\n</script>\n<style>\n  .x {}\n</style>';
        const doc = await vscode.workspace.openTextDocument({ language: 'vue', content: original });
        const editor = await vscode.window.showTextDocument(doc);
        editor.options = { tabSize: 8, indentSize: 8, insertSpaces: true };
        await vscode.workspace.getConfiguration('vueIndent').update('commandsEnabled', true, vscode.ConfigurationTarget.Global);
        controller = createController(vscode);
        editor.selections = [new vscode.Selection(1, 2, 1, 2), new vscode.Selection(4, 4, 4, 4), new vscode.Selection(7, 2, 7, 2)];
        assert.equal(await vscode.commands.executeCommand('vue-indent.indent'), true);
        assert.equal(doc.lineAt(1).text, '    <div/>');
        assert.equal(doc.lineAt(4).text, '        const x=1');
        assert.equal(doc.lineAt(7).text, '    .x {}');
        assert.deepEqual(editor.selections.map(s => s.active.character), [4,8,4]);
        assert.equal(editor.options.tabSize, 8);
        await vscode.commands.executeCommand('undo');
        assert.equal(doc.getText(), original);
        editor.selection = new vscode.Selection(0,0,8,0);
        await vscode.commands.executeCommand('vue-indent.outdent');
        assert.equal(doc.lineAt(1).text, '<div/>');
        assert.equal(doc.lineAt(4).text, 'const x=1');
        assert.equal(doc.lineAt(7).text, '.x {}');
        assert.equal(doc.lineAt(0).text, '<template>');
    });
});
