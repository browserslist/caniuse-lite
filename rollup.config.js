const buble = require('rollup-plugin-buble');
const clean = require('rollup-plugin-cleanup');
const pkg = require('./package.json');

export default {
    plugins: [
        buble(),
        clean(),
    ],
    format: 'cjs',
    external: [
        ...Object.keys(pkg.devDependencies),
        'fs',
        'path',
    ],
};
