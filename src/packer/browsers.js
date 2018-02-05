/* Create a mapping from browser version strings to shorter identifiers. */

import fs from 'mz/fs';
import writeFile from 'write-file-promise';
import path from 'path';
import stringifyObject from '../lib/stringifyObject';
import { encode } from '../lib/base62';

function getBrowsers(data) {
    const feature = Object.keys(data)[0];
    const browsers = Object.keys(data[feature].stats);

    return browsers.reduce((packed, browser, index) => {
        packed[encode(index)] = browser;
        return packed;
    }, {});
}

export default function packBrowsers() {
    return writeFile(
        path.join(__dirname, `../../data/browsers.js`),
        stringifyObject(getBrowsers(require('caniuse-db/data.json').data))
    );
}
