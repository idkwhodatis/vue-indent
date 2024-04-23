const vscode=require('vscode');

let originalSettings={};

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context){
	console.log('Congratulations, your extension "vue-indent" is now active!');

	let disposable=vscode.window.onDidChangeTextEditorSelection(event=>{
        if(vscode.window.activeTextEditor){
            const editor=vscode.window.activeTextEditor;
            const document=editor.document;
            const selection=editor.selection;
            const position=selection.active;
            const text=document.getText();
            const config=vscode.workspace.getConfiguration('vueIndent');

            originalSettings={
                detectIndentation:config.get('detectIndentation'),
                tabSize:config.get('tabSize'),
                insertSpaces:config.get('insertSpaces')
            };

            let inTemplate=false;
            let inScript=false;
            let inStyle=false;

            const cursorOffset=document.offsetAt(position);
            inTemplate=cursorOffset>text.indexOf('<template>') && cursorOffset<text.lastIndexOf('</template>');
            inScript=cursorOffset>text.indexOf('<script') && cursorOffset<text.lastIndexOf('</script>');
            inStyle=cursorOffset>text.indexOf('<style') && cursorOffset<text.lastIndexOf('</style>');

            if(inTemplate){
                editor.options={...editor.options,insertSpaces:false,detectIndentation:false,tabSize:config.get('templateIndentSize')};
            }else if(inStyle){
                editor.options={...editor.options,insertSpaces:false,detectIndentation:false,tabSize:config.get('styleIndentSize')};
            }else if(inScript){
                editor.options={...editor.options,insertSpaces:false,detectIndentation:false,tabSize:config.get('scriptIndentSize')};
            }
        }
    });

	context.subscriptions.push(disposable);
}

function deactivate(){
    const editor=vscode.window.activeTextEditor;
    editor.options={...editor.options,insertSpaces:originalSettings.insertSpaces,detectIndentation:originalSettings.detectIndentation,tabSize:originalSettings.tabSize};
}

module.exports={
	activate,
	deactivate
}
