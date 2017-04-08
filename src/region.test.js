import path from 'path';
import fs from 'mz/fs';
import getContentsFactory from './lib/getContents';
import regions from './unpacker/region';

let fulldata = {};

const base = path.join(
    path.dirname(require.resolve(`caniuse-db/data.json`)),
    `region-usage-json`
);

const getContents = getContentsFactory(base);

beforeAll(() => {
    return fs.readdir(base)
        .then(getContents)
        .then(regions => {
            regions.forEach(region => {
                fulldata[region.name] = region.contents;
            });
        });
});

it('should be 1:1', () => {
    Object.keys(fulldata).forEach(key => {
        const data = fulldata[key];
        const packed = require(path.join(__dirname, `../data/regions/${key}.js`));
        const unpacked = regions(packed);
        expect(unpacked).toEqual(data.data);
    });
});
