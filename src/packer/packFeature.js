import alphasort from 'alphanum-sort';
import supported from '../supported';
import browsers from './browsersInverted';
import statuses from './statusesInverted';

function formatKey (versions) {
    const first = versions[0];
    const last = versions[versions.length - 1];

    if (first === last) {
        return first;
    }
    return `${first} ${last}`;
}

function formatSupport (support) {
    const parts = support.split(' ');

    return parts.reduce((bitmask, part) => {
        if (supported[part]) {
            return bitmask + supported[part];
        }
        // Handle notes - #1 = 128, #2 = 256, #3 = 512, etc
        return bitmask + Math.pow(2, parseInt(part.slice(1), 10) + 6);
    }, 0);
}

export default function packFeature (feature) {
    const converted = {};

    const stats = Object.keys(feature.stats).reduce((list, browser) => {
        const stats = feature.stats[browser];
        const versions = alphasort(Object.keys(stats));
        list[browsers[browser]] = versions.reduce((map, version, index) => {
            const support = formatSupport(stats[version]);
            if (!map.current.support) {
                map.current.support = support;
            }
            if (map.current.support === support) {
                map.current.versions.push(version);
            } else {
                const {versions} = map.current;
                const key = formatKey(versions);
                map.data[key] = map.current.support;
                map.current.versions = [version];
                map.current.support = support;
            }
            if (index === versions.length - 1) {
                const {versions} = map.current;
                const key = formatKey(versions);
                map.data[key] = map.current.support;
            }
            return map;
        }, {current: {versions: [], support: 0}, data: {}}).data;
        return list;
    }, {});
    converted[1] = stats;
    converted[2] = parseInt(statuses[feature.status]);
    return converted;
}
