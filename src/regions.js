const { parse } = require('@vue/compiler-sfc');

/**
 * Vue's parser understands comments, attributes, raw text and multiple SFC blocks.
 * Invalid/incomplete documents fail closed until the user finishes the syntax.
 * @param {string} source
 * @returns {{ start: number, end: number, kind: 'template' | 'script' | 'style' }[]}
 */
function regions(source) {
    const { descriptor, errors } = parse(source, { sourceMap: false, ignoreEmpty: false });
    if (errors.length) return [];
    const blocks = [descriptor.template, descriptor.script, descriptor.scriptSetup, ...descriptor.styles];
    return blocks.flatMap(block => block ? [{
        start: block.loc.start.offset,
        end: block.loc.end.offset,
        kind: /** @type {'template' | 'script' | 'style'} */ (block.type)
    }] : []);
}

module.exports = { regions };
