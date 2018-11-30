import path from 'path';
import fs from 'mz/fs';
import getContentsFactory from './lib/getContents';
import features from './unpacker/feature';

let fulldata = {};

const base = path.join(
    path.dirname(require.resolve(`caniuse-db/data.json`)),
    `features-json`
);

const getContents = getContentsFactory(base);

beforeAll(() => {
    return fs.readdir(base)
        .then(getContents)
        .then(features => {
            features.forEach(feature => {
                fulldata[feature.name] = feature.contents;
            });
        });
});

it('should be 1:1', () => {
    Object.keys(fulldata).forEach(key => {
        const data = fulldata[key];
        const packed = require(path.join(__dirname, `../data/features/${key}.js`));
        const unpacked = features(packed);
        expect(Object.keys(unpacked.stats)).toEqual(Object.keys(data.stats));
        Object.keys(unpacked.stats).forEach(browser => {
            Object.keys(unpacked.stats[browser]).forEach(version => {
                const unpackedSupport = unpacked.stats[browser][version].split(' ');
                const originalSupport = data.stats[browser][version].split(' ');
                unpackedSupport.forEach(value => {
                  expect(originalSupport).toContain(value);
                })
            });
        });
        expect(unpacked.status).toEqual(data.status);
        expect(unpacked.title).toEqual(data.title);
    });
});
