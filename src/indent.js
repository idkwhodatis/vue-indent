/** @typedef {{ start: number, end: number, kind: 'template' | 'script' | 'style' }} Region */
/** @typedef {{ start: number, end: number }} OffsetSelection */
/** @typedef {{ start: number, end: number, text: string }} IndentEdit */

/**
 * Plan explicit line indentation without changing editor options or source text.
 * Offsets use JavaScript/VS Code UTF-16 units. A nonempty selection ending at
 * column zero excludes that final line; overlapping selections affect a line once.
 * Only lines wholly inside one SFC content range are eligible. Wrapper lines,
 * including inline wrappers sharing a line with content, are deliberately skipped.
 * Each line gains/loses its block width in visual columns. Tabs advance to fixed
 * editor tab stops; output uses spaces or tabs plus residual spaces accordingly.
 * Existing non-leading text and all line endings are left byte-for-byte unchanged.
 * Invalid widths/tab size/ranges fail closed, never producing speculative edits.
 * @param {string} source
 * @param {Region[]} ranges
 * @param {OffsetSelection[]} selections
 * @param {{ template: number, script: number, style: number }} widths
 * @param {number} tabSize
 * @param {boolean} insertSpaces
 * @param {boolean} [outdent]
 * @returns {IndentEdit[]}
 */
function planIndent(source, ranges, selections, widths, tabSize, insertSpaces, outdent = false) {
    if (!Number.isInteger(tabSize) || tabSize < 1 || tabSize > 32 || typeof insertSpaces !== 'boolean') return [];
    const validRanges = ranges.filter(range =>
        Number.isInteger(range.start) && Number.isInteger(range.end) &&
        range.start >= 0 && range.end >= range.start && range.end <= source.length);
    const selected = selections.filter(selection =>
        Number.isInteger(selection.start) && Number.isInteger(selection.end) &&
        selection.start >= 0 && selection.end >= 0 &&
        selection.start <= source.length && selection.end <= source.length
    ).map(selection => ({ start: Math.min(selection.start, selection.end), end: Math.max(selection.start, selection.end) }));
    /** @type {IndentEdit[]} */
    const edits = [];
    // Split only for offsets; CRLF and LF are never included in an edit.
    const lines = source.split('\n');
    let lineStart = 0;
    for (let index = 0; index < lines.length; index++) {
        const rawLine = lines[index];
        const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
        const lineEnd = lineStart + line.length;
        const nextStart = lineStart + rawLine.length + 1;
        const touched = selected.some(selection => {
            if (selection.start === selection.end) return selection.start >= lineStart && selection.start < nextStart;
            return selection.start < nextStart && selection.end > lineStart;
        });
        if (touched) {
            const containing = validRanges.filter(range => lineStart >= range.start && lineEnd <= range.end);
            // Ambiguous overlapping ranges must not determine destructive behavior.
            if (containing.length === 1) {
                const width = widths[containing[0].kind];
                if (Number.isInteger(width) && width >= 1 && width <= 32) {
                    const prefix = /^[ \t]*/.exec(line)?.[0] || '';
                    let columns = 0;
                    for (const char of prefix) columns += char === '\t' ? tabSize - columns % tabSize : 1;
                    const desired = outdent ? Math.max(0, columns - width) : columns + width;
                    const text = insertSpaces ? ' '.repeat(desired) : '\t'.repeat(Math.floor(desired / tabSize)) + ' '.repeat(desired % tabSize);
                    if (prefix !== text) edits.push({ start: lineStart, end: lineStart + prefix.length, text });
                }
            }
        }
        lineStart = nextStart;
    }
    return edits;
}

module.exports = { planIndent };
