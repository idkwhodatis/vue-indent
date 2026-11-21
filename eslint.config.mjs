import globals from 'globals';

export default [
    { ignores: ['node_modules/**', '.vscode-test/**'] },
    {
        files: ['**/*.js', '**/*.mjs'],
        languageOptions: {
            ecmaVersion: 2018,
            sourceType: 'module',
            globals: { ...globals.node, ...globals.mocha }
        },
        rules: {
            'no-const-assign': 'warn',
            'no-this-before-super': 'warn',
            'no-undef': 'warn',
            'no-unreachable': 'warn',
            'no-unused-vars': 'warn',
            'constructor-super': 'warn',
            'valid-typeof': 'warn'
        }
    }
];
