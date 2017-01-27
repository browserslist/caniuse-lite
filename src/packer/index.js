import fs from 'fs';
import path from 'path';
import timsort from 'timsort';
import packAgents from './packAgents';
import packFeature from './packFeature';
import packRegion from './packRegion';
import generateBrowsersMap from './generateBrowsersMap';
import generateIndex from './generateIndex';

const base = path.join(__dirname, '../node_modules/caniuse-db/');
const features = `${base}features-json`;

function write (fpath, contents) {
    return fs.writeFile(path.join(__dirname, `../data/${fpath}`), contents);
}

const keys = {};

function compressFeatures (invertedMap, data) {
    return {
        "1": Object.keys(data[1]).reduce((browsers, browser) => {
            browsers[browser] = Object.keys(data[1][browser]).reduce((versions, version) => {
                versions[invertedMap[version]] = data[1][browser][version];
                return versions;
            }, {});
            return browsers;
        }, {}),
        "2": data[2],
    };
}

fs.readdir(features, function (err, files) {
    const map = {};
    files.forEach(file => {
        map[path.basename(file, '.json')] = `./features-json/${file}`;
        const data = packFeature(require(`${features}/${file}`))[1];
        Object.keys(data).forEach(d => {
            Object.keys(data[d]).forEach(key => {
                if (!keys[key]) keys[key] = 0;
                keys[key] += 1;
            });
        });
    });
    write('features.js', generateIndex(map));
    let keysArray = Object.keys(keys);
    timsort.sort(keysArray, (a, b) => b.length - a.length);
    timsort.sort(keysArray, (a, b) => keys[b] - keys[a]);
    const data = keysArray.reduce((list, key) => {
        return list.concat(key);
    }, []);
    write('browsers.js', generateBrowsersMap(data));
    const map2 = data.reduce((list, version, index) => {
        list[version] = index + 1;
        return list;
    }, {});
    files.forEach(file => {
        const data = packFeature(require(`${features}/${file}`));
        write(
            `features-json/${file}`,
            JSON.stringify(compressFeatures(map2, data))
        );
    });
});

const region = `${base}region-usage-json`;

fs.readdir(region, function (err, files) {
    files.forEach(file => {
        write(
            `region-usage-json/${file}`,
            JSON.stringify(packRegion(require(`${region}/${file}`)))
        );
    });
});

write(
    `agents.json`,
    JSON.stringify(packAgents(require(`${base}data.json`)))
);
