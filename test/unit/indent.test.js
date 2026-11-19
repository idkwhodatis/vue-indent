const { test } = require('node:test');
const assert = require('node:assert/strict');
const { planIndent } = require('../../src/indent');
const widths = { template: 2, script: 4, style: 2 };
function fixture(eol = '\n') {
    const source = ['<template>', '  <p>😀 hi</p>', '</template>', '<script>', '  const x = 1;', '</script>', '<style>', '  p { color: red; }', '</style>'].join(eol);
    const ranges = ['template', 'script', 'style'].map(kind => ({ start: source.indexOf(`<${kind}>`) + kind.length + 2, end: source.indexOf(`</${kind}>`), kind }));
    return { source, ranges };
}
function apply(source, edits) {
    for (const edit of [...edits].reverse()) source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
    return source;
}
test('cross-block selection uses each line width, excludes wrapper lines', () => {
    const { source, ranges } = fixture();
    const edits = planIndent(source, ranges, [{ start: 0, end: source.length }], widths, 4, true);
    assert.equal(edits.length, 3);
    assert.equal(apply(source, edits), source.replace('  <p>', '    <p>').replace('  const', '      const').replace('  p {', '    p {'));
});
test('mixed multicursors and overlapping selections modify a line once', () => {
    const { source, ranges } = fixture();
    const p = source.indexOf('<p>'); const script = source.indexOf('const');
    const edits = planIndent(source, ranges, [{ start: p, end: p }, { start: p, end: script + 1 }, { start: script, end: script }], widths, 4, true);
    assert.equal(edits.length, 2);
    assert.equal(edits[0].text.length, 4); assert.equal(edits[1].text.length, 6);
});
test('selection ending at column zero excludes final line; reversed selections match', () => {
    const source = '<script>\na\nb\n</script>';
    const ranges = [{ start: 8, end: source.indexOf('</script>'), kind: 'script' }];
    const end = source.indexOf('\nb') + 1;
    const expected = [{ start: 9, end: 9, text: '    ' }];
    assert.deepEqual(planIndent(source, ranges, [{ start: 9, end }], widths, 4, true), expected);
    assert.deepEqual(planIndent(source, ranges, [{ start: end, end: 9 }], widths, 4, true), expected);
});
test('cursor at column zero targets its own line', () => {
    const source = '<script>\na\nb\n</script>'; const offset = source.indexOf('\nb') + 1;
    const edits = planIndent(source, [{ start: 8, end: source.indexOf('</script>'), kind: 'script' }], [{ start: offset, end: offset }], widths, 4, true);
    assert.deepEqual(edits, [{ start: offset, end: offset, text: '    ' }]);
});
test('CRLF and non-whitespace text, including surrogate pairs, preserved', () => {
    const { source, ranges } = fixture('\r\n');
    const result = apply(source, planIndent(source, ranges, [{ start: 0, end: source.length }], widths, 4, true));
    assert.equal(result.split('\r\n').length, 9);
    assert.equal(result.replace(/^[ \t]*/gm, ''), source.replace(/^[ \t]*/gm, ''));
});
test('mixed tab/space prefix evaluated by visual tab stops', () => {
    const source = '<script>\n \t  value\n</script>';
    const ranges = [{ start: 8, end: source.indexOf('</script>'), kind: 'script' }];
    const selection = [{ start: source.indexOf('value'), end: source.indexOf('value') }];
    assert.equal(planIndent(source, ranges, selection, widths, 4, false)[0].text, '\t\t  ');
    assert.equal(planIndent(source, ranges, selection, widths, 4, true)[0].text, ' '.repeat(10));
    assert.equal(planIndent(source, ranges, selection, widths, 4, false, true)[0].text, '  ');
});
test('outdent clamps at zero and unindented text produces no edit', () => {
    const source = '<script>\n  value\nzero\n</script>';
    const ranges = [{ start: 8, end: source.indexOf('</script>'), kind: 'script' }];
    const edits = planIndent(source, ranges, [{ start: 0, end: source.length }], widths, 4, true, true);
    assert.deepEqual(edits, [{ start: 9, end: 11, text: '' }]);
});
test('inline wrapper/content lines and outside lines skipped', () => {
    const source = 'outside\n<script>const x=1</script>\n';
    const ranges = [{ start: source.indexOf('const'), end: source.indexOf('</script>'), kind: 'script' }];
    assert.deepEqual(planIndent(source, ranges, [{ start: 0, end: source.length }], widths, 4, true), []);
});
test('blank content lines are indented but empty trailing outside line is not', () => {
    const source = '<script>\n\n</script>\n';
    const ranges = [{ start: 8, end: source.indexOf('</script>'), kind: 'script' }];
    assert.deepEqual(planIndent(source, ranges, [{ start: 0, end: source.length }], widths, 4, true), [{ start: 9, end: 9, text: '    ' }]);
});
test('invalid inputs and ambiguous ranges fail closed', () => {
    const source = 'line'; const ranges = [{ start: 0, end: 4, kind: 'script' }]; const selections = [{ start: 0, end: 4 }];
    assert.deepEqual(planIndent(source, ranges, selections, widths, 0, true), []);
    assert.deepEqual(planIndent(source, ranges, selections, { ...widths, script: 2.5 }, 4, true), []);
    assert.deepEqual(planIndent(source, [...ranges, ...ranges], selections, widths, 4, true), []);
    assert.deepEqual(planIndent(source, ranges, [{ start: -1, end: 4 }], widths, 4, true), []);
    assert.deepEqual(planIndent(source, [{ start: -1, end: 4, kind: 'script' }], selections, widths, 4, true), []);
});
test('edits sorted, nonoverlapping and deterministic regardless of selection order', () => {
    const { source, ranges } = fixture(); const offsets = [source.indexOf('const'), source.indexOf('<p>'), source.indexOf('p {')];
    const selections = offsets.map(start => ({ start, end: start }));
    const edits = planIndent(source, ranges, selections, widths, 8, false);
    assert.deepEqual(edits, planIndent(source, ranges, [...selections].reverse(), widths, 8, false));
    assert.ok(edits.every((edit, i) => !i || edit.start > edits[i - 1].end));
});
