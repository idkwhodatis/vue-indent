/**
 * Compute guide anchors only at real leading-whitespace boundaries. Tabs use the
 * editor's fixed display width. A guide inside a tab cannot be represented by a
 * character range, so omit it rather than moving text or drawing a false column.
 * @param {string} source
 * @param {ReturnType<typeof import('./regions').regions>} ranges
 * @param {Record<string, number>} widths
 * @param {number} tabSize
 * @returns {{line:number, character:number}[]}
 */
function guideAnchors(source, ranges, widths, tabSize) {
    const result = [];
    let offset = 0;
    for (const [line, raw] of source.split('\n').entries()) {
        const text = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
        const region = ranges.find(range => offset >= range.start && offset + text.length <= range.end);
        if (region) {
            const width = widths[region.kind];
            let visual = 0;
            for (let character = 0; character < text.length; character++) {
                const char = text[character];
                if (char !== ' ' && char !== '\t') break;
                if (visual % width === 0) result.push({ line, character });
                visual += char === '\t' ? tabSize - visual % tabSize : 1;
            }
        }
        offset += raw.length + 1;
    }
    return result;
}
module.exports = { guideAnchors };
