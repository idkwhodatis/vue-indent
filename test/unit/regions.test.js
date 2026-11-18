const { test } = require('node:test');
const assert = require('node:assert/strict');
const { regions } = require('../../src/regions');
const find = (source, token) => regions(source).find(r => source.indexOf(token) >= r.start && source.indexOf(token) < r.end)?.kind;
test('attributes, TS setup, Pug and scoped style', () => {
 const source='<script setup lang="ts">const x=1</script>\n<template lang="pug">p hello</template>\n<style scoped>p {color:red}</style>';
 assert.equal(find(source,'const x'),'script');assert.equal(find(source,'p hello'),'template');assert.equal(find(source,'color'),'style');
});
test('multiple styles do not swallow intervening script',()=>{
 const source='<style>.a{}</style><script>let a=1</script><style scoped>.b{}</style>';
 assert.equal(find(source,'let a'),'script');assert.equal(regions(source).filter(r=>r.kind==='style').length,2);
});
test('comment tags ignored',()=>{const source='<!-- <template>fake</template> --><script>let a=1</script>';assert.equal(find(source,'fake'),undefined);assert.equal(find(source,'let a'),'script');});
test('template-looking text in script is not a block',()=>{const source='<script>const s="<template>x</template>";</script>';assert.equal(find(source,'const s'),'script');});
test('nested templates and CRLF',()=>{const source='<template>\r\n<template v-if="x"><p>hello</p></template>\r\n</template>';assert.equal(find(source,'hello'),'template');assert.equal(regions(source).length,1);});
test('incomplete syntax fails closed',()=>{for(const source of ['<template><p>hello','<script>const x=1','<style scoped','']) assert.deepEqual(regions(source),[]);});
test('tag boundaries excluded from content ranges',()=>{const source='<template><p>hello</p></template>';assert.equal(find(source,'<template>'),undefined);assert.equal(find(source,'</template>'),undefined);});
test('empty script/style remain editable regions',()=>{const source='<script>\n\n</script><style>\n\n</style>';assert.deepEqual(regions(source).map(r=>r.kind),['script','style']);});
