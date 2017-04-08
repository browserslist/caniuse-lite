import {browsers} from './browsers';
import {browserVersions as versions} from './browserVersions';

const agentsData = require('../../data/agents');

function unpackBrowserVersions (versionsData) {
    return Object.keys(versionsData).reduce((usage, version) => {
        usage[versions[version]] = versionsData[version];
        return usage;
    }, {});
}

export const agents = Object.keys(agentsData).reduce((map, key) => {
    const versionsData = agentsData[key];
    map[browsers[key]] = Object.keys(versionsData).reduce((data, entry) => {
        if (entry === 'A') {
            data.usage_global = unpackBrowserVersions(versionsData[entry]);
        } else if (entry === 'C') {
            data.versions = versionsData[entry].reduce((list, version) => {
                if (version === '') {
                    list.push(null);
                } else {
                    list.push(versions[version])
                }
                return list;
            }, []);
        } else if (entry === 'D') {
            data.prefix_exceptions = unpackBrowserVersions(versionsData[entry]);
        } else { // entry is B
            data.prefix = versionsData[entry];
        }
        return data;
    }, {});
    return map;
}, {});
