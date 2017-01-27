import {agents} from './agents';
import browsers from './browsers';
import statuses from './statuses';
import unpack from './unpack';

/*
 * Load this dynamically so that it
 * doesn't appear in the rollup bundle.
 */

const versionData = require('../data/browsers');

function toFloat (versions) {
    return versions.reduce((list, version) => {
        if (Number.isNaN(parseFloat(version))) {
            return list.concat(version);
        }
        if (~version.indexOf('-')) {
            return list.concat(toFloat(version.split('-')));
        }
        return list.concat(parseFloat(version));
    }, []);
}

export function feature (data) {
    return Object.keys(data).reduce((list, key) => {
        if (key === '1') {
            list.stats = Object.keys(data[key]).reduce((map, browser) => {
                const versions = toFloat(agents[browsers[browser]].versions);
                map[browsers[browser]] = Object.keys(data[key][browser]).reduce((sub, stats) => {
                    const uncompressed = versionData[stats];
                    let [min, max] = toFloat(uncompressed.split(' '));
                    if (max === 'TP') {
                        max = 999999999999;
                    }
                    const unpacked = unpack(data[key][browser][stats]);
                    if (!max) {
                        sub[min] = unpacked;
                        return sub;
                    }
                    versions.forEach(version => {
                        if (typeof version === 'string') {
                            sub[version] = unpacked;
                            return;
                        }
                        if (version >= min && version <= max) {
                            sub[version] = unpacked;
                        }
                    });
                    return sub;
                }, {});
                return map;
            }, {});
        }
        if (key === '2') {
            list.status = statuses[key];
        }
        return list;
    }, {});
}
