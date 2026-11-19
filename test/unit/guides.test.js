const test = require('node:test');
const assert = require('node:assert/strict');
const { guideAnchors } = require('../../src/guides');
const { regions } = require('../../src/regions');
const widths = { template:2, script:4, style:2 };
const anchors = (s,tab=4) => guideAnchors(s,regions(s),widths,tab);
test('guides use each region interval and actual whitespace characters', () => {
    const s='<template>\n    <div/>\n</template>\n<script>\n        x()\n</script>\n<style>\n    .x{}\n</style>\n<style scoped>\n  .y{}\n</style>';
    assert.deepEqual(anchors(s), [{line:1,character:0},{line:1,character:2},{line:4,character:0},{line:4,character:4},{line:7,character:0},{line:7,character:2},{line:10,character:0}]);
});
test('tabs use fixed visual stops; no imaginary anchors inside tabs', () => {
    assert.deepEqual(anchors('<template>\n\t  <div/>\n</template>',4),[{line:1,character:0},{line:1,character:1}]);
});
test('skip invalid/incomplete SFCs and inline wrapper lines; handle CRLF', () => {
    assert.deepEqual(anchors('<template>\n  <div>'),[]);
    assert.deepEqual(anchors('<template>  <div/></template>'),[]);
    assert.deepEqual(anchors('<template>\r\n  <div/>\r\n</template>'),[{line:1,character:0}]);
});
