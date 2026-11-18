const assert = require('assert');
const vscode = require('vscode');
const { createController } = require('../src/controller');

suite('Vue indentation integration', () => {
    let controller;
    setup(async () => {
        await vscode.extensions.getExtension('idkwhodatis.vue-indent').activate();
        require('../extension').deactivate();
    });
    teardown(() => { controller?.dispose(); controller = undefined; });
    test('Vue block changes preserve spaces and restore actual editor options', async () => {
        const doc = await vscode.workspace.openTextDocument({ language: 'vue', content: '<template>hello</template>\n<script>const x=1</script>' });
        const editor = await vscode.window.showTextDocument(doc);
        editor.options = { tabSize: 8, indentSize: 8, insertSpaces: true };
        editor.selection = new vscode.Selection(doc.positionAt(11), doc.positionAt(11));
        controller = createController(vscode);
        assert.equal(editor.options.tabSize, 2);
        assert.equal(editor.options.insertSpaces, true);
        editor.selection = new vscode.Selection(doc.positionAt(35), doc.positionAt(35));
        await vscode.commands.executeCommand('vue-indent.activate');
        assert.equal(editor.options.tabSize, 4);
        await vscode.languages.setTextDocumentLanguage(doc, 'html');
        await vscode.commands.executeCommand('vue-indent.activate');
        assert.equal(editor.options.tabSize, 8);
        controller.dispose();
        assert.equal(editor.options.tabSize, 8);
        assert.equal(editor.options.insertSpaces, true);
    });
    test('HTML editor is not changed', async () => {
        const doc = await vscode.workspace.openTextDocument({ language: 'html', content: '<template>hello</template>' });
        const editor = await vscode.window.showTextDocument(doc);
        editor.options = { tabSize: 8, insertSpaces: false };
        editor.selection = new vscode.Selection(doc.positionAt(11), doc.positionAt(11));
        controller = createController(vscode);
        assert.equal(editor.options.tabSize, 8);
        assert.equal(editor.options.insertSpaces, false);
    });
});
