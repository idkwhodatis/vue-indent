const { test }=require('node:test');const assert=require('node:assert/strict');const {createController}=require('../../src/controller');
function setup(source='<template>hello</template><script>const x=1</script>', languageId='vue'){
 const listeners={};let writes=0,reads=0,scope;const settings={templateIndentSize:2,scriptIndentSize:4,styleIndentSize:2};
 const doc={languageId,version:1,isClosed:false,uri:{path:'test.vue'},getText:()=>{reads++;return source;},offsetAt:p=>p};
 const editor={document:doc,selections:[{start:10,end:10}]};let opts={tabSize:8,indentSize:'tabSize',insertSpaces:true};Object.defineProperty(editor,'options',{get:()=>opts,set:value=>{opts={...opts,...value};writes++;}});
 const on=name=>fn=>{listeners[name]=fn;return{dispose(){delete listeners[name];}}};
 const api={window:{activeTextEditor:editor,onDidChangeTextEditorSelection:on('selection'),onDidChangeActiveTextEditor:on('active')},workspace:{getConfiguration:(_,uri)=>{scope=uri;return{get:(key,def)=>settings[key]??def};},onDidChangeTextDocument:on('change'),onDidChangeConfiguration:on('config'),onDidOpenTextDocument:on('open'),onDidCloseTextDocument:on('close')},commands:{registerCommand:(name,fn)=>on(name)(fn)}};
 const controller=createController(api);
 return {api,editor,doc,settings,listeners,controller,get writes(){return writes;},get reads(){return reads;},get scope(){return scope;},move(offset){editor.selections=[{start:offset,end:offset}];listeners.selection({textEditor:editor});},setText(text){source=text;doc.version++;listeners.change({document:doc});}};
}
test('applies immediately; preserves spaces and URI scope',()=>{const s=setup();assert.equal(s.editor.options.tabSize,2);assert.equal(s.editor.options.insertSpaces,true);assert.equal(s.scope,s.doc.uri);s.controller.dispose();assert.equal(s.editor.options.tabSize,8);assert.equal(s.editor.options.indentSize,'tabSize');});
test('does not touch non-Vue files',()=>{const s=setup(undefined,'html');assert.equal(s.writes,0);s.controller.dispose();});
test('switches blocks without repeated rescans or writes',()=>{const s=setup();s.move(11);assert.equal(s.reads,1);assert.equal(s.writes,1);s.move(35);assert.equal(s.editor.options.tabSize,4);assert.equal(s.reads,1);});
test('outside block restores; cache invalidated on text edit',()=>{const s=setup();s.move(0);assert.equal(s.editor.options.tabSize,8);s.setText('<template>unfinished');assert.equal(s.reads,2);assert.equal(s.editor.options.tabSize,8);});
test('mixed-block multicursors restore baseline',()=>{const s=setup();s.editor.selections=[{start:11,end:11},{start:35,end:35}];s.listeners.selection({textEditor:s.editor});assert.equal(s.editor.options.tabSize,8);});
test('selection spanning blocks restores baseline',()=>{const s=setup();s.editor.selections=[{start:11,end:35}];s.listeners.selection({textEditor:s.editor});assert.equal(s.editor.options.tabSize,8);});
test('inactive editor events ignored',()=>{const s=setup();s.listeners.selection({textEditor:{}});assert.equal(s.writes,1);});
test('switching away restores; no-editor disposal safe and idempotent',()=>{const s=setup();s.api.window.activeTextEditor=undefined;s.listeners.active();assert.equal(s.editor.options.tabSize,8);s.controller.dispose();s.controller.dispose();assert.deepEqual(Object.keys(s.listeners),[]);});
test('resource config updates and invalid config rejected',()=>{const s=setup();s.settings.templateIndentSize=3;s.listeners.config({affectsConfiguration:()=>true});assert.equal(s.editor.options.tabSize,3);s.settings.templateIndentSize=0;s.listeners.config({affectsConfiguration:()=>true});assert.equal(s.editor.options.tabSize,8);});
test('manual settings survive disposal',()=>{const s=setup();s.editor.options={tabSize:6};s.controller.dispose();assert.equal(s.editor.options.tabSize,6);});
test('manual change becomes new baseline on next update',()=>{const s=setup();s.editor.options={tabSize:6};s.move(11);s.controller.dispose();assert.equal(s.editor.options.tabSize,6);});
test('tabs preference remains untouched',()=>{const s=setup();s.editor.options={insertSpaces:false};s.move(35);assert.equal(s.editor.options.insertSpaces,false);s.controller.dispose();assert.equal(s.editor.options.insertSpaces,false);});
test('command registered and close releases state',()=>{const s=setup();assert.equal(typeof s.listeners['vue-indent.activate'],'function');s.doc.isClosed=true;s.listeners.close(s.doc);assert.equal(s.editor.options.tabSize,8);const before=s.writes;s.controller.dispose();assert.equal(s.writes,before);});

test('language mode transition restores and reapplies',()=>{const s=setup();s.listeners.close(s.doc);s.doc.languageId='html';s.listeners.open(s.doc);assert.equal(s.editor.options.tabSize,8);s.doc.languageId='vue';s.listeners.open(s.doc);assert.equal(s.editor.options.tabSize,2);s.controller.dispose();});
