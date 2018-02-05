import path from 'path';
import fs from 'mz/fs';
import writeFile from 'write-file-promise';
import * as t from 'babel-types';
import { invertObj } from 'ramda';
import { encode } from '../lib/base62';
import generateCode from '../lib/generateCode';
import getContentsFactory from '../lib/getContents';
import moduleExports from '../lib/moduleExports';
import stringifyObject from '../lib/stringifyObject';
import statuses from '../lib/statuses';
import supported from '../lib/supported';

const browsers = require('../../data/browsers');
const versions = require('../../data/browserVersions');

const browsersInverted = invertObj(browsers);
const statusesInverted = invertObj(statuses);
const versionsInverted = invertObj(versions);

const base = path.join(
    path.dirname(require.resolve(`caniuse-db/data.json`)),
    `features-json`
);

const getContents = getContentsFactory(base);

const requireCall = path =>
    t.callExpression(t.identifier('require'), [t.stringLiteral(path)]);

const featureIndex = data =>
    generateCode(
        t.program([
            moduleExports(
                t.objectExpression(
                    Object.keys(data).map(key =>
                        t.objectProperty(
                            t.stringLiteral(key),
                            requireCall(data[key])
                        )
                    )
                )
            )
        ])
    );

function packSupport(support) {
    const parts = support.split(' ');

    return parts.reduce((bitmask, part) => {
        if (supported[part]) {
            return bitmask + supported[part];
        }
        // Handle notes - #1 = 128, #2 = 256, #3 = 512, etc
        return bitmask + Math.pow(2, parseInt(part.slice(1), 10) + 6);
    }, 0);
}

export default function packFeature() {
    return fs
        .readdir(base)
        .then(getContents)
        .then(features => {
            const index = features.reduce((map, feature) => {
                const { name } = feature;
                map[name] = `./features/${name}`;
                return map;
            }, {});
            return writeFile(
                path.join(__dirname, '../../data/features.js'),
                featureIndex(index)
            ).then(() => features);
        })
        .then(features => {
            return Promise.all(
                features.map(feature => {
                    const { name, contents } = feature;
                    const packed = {};
                    packed.A = Object.keys(contents.stats).reduce(
                        (browserStats, key) => {
                            const browser = contents.stats[key];
                            const supportData = Object.keys(browser).reduce(
                                (stats, version) => {
                                    const support = browser[version];
                                    stats[
                                        versionsInverted[version]
                                    ] = packSupport(support);
                                    return stats;
                                },
                                {}
                            );
                            let compacted = Object.keys(supportData).reduce(
                                (min, k) => {
                                    const value = supportData[k];
                                    if (!min[value]) {
                                        min[value] = k;
                                    } else {
                                        min[value] += ` ${k}`;
                                    }
                                    return min;
                                },
                                {}
                            );
                            browserStats[browsersInverted[key]] = compacted;
                            return browserStats;
                        },
                        {}
                    );
                    packed.B = parseInt(statusesInverted[contents.status], 10);
                    packed.C = contents.title;
                    return writeFile(
                        path.join(__dirname, `../../data/features/${name}.js`),
                        stringifyObject(packed)
                    );
                })
            );
        });
}
