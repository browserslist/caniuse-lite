import fs from 'mz/fs';
import writeFile from 'write-file-promise';
import path from 'path';
import { invertObj, prop } from 'ramda';
import stringifyObject from '../lib/stringifyObject';
import { encode } from '../lib/base62';

const browsersData = require('../../data/browsers');
const browsers = invertObj(browsersData);

function relevantKeys(versions, agents, fullAgents) {
    const versionsInverted = invertObj(versions);
    return Object.keys(agents).reduce((map, key) => {
        const agent = agents[key];
        map[browsers[key]] = {
            A: Object.keys(agent.usage_global).reduce((list, k) => {
                const val = agent.usage_global[k];
                list[versionsInverted[k]] = val;
                return list;
            }, {}),
            B: agent.prefix,
            C: agent.versions.reduce((list, version) => {
                if (version === null) {
                    return [...list, ''];
                }
                return [...list, versionsInverted[version]];
            }, []),
            E: agent.browser,
            F: fullAgents[key].version_list.reduce((map, item) => {
                map[versionsInverted[item.version]] = item.release_date;
                return map;
            }, {})
        };
        if (agent.prefix_exceptions) {
            map[browsers[key]].D = agent.prefix_exceptions;
            map[browsers[key]].D = Object.keys(agent.prefix_exceptions).reduce(
                (list, k) => {
                    const val = agent.prefix_exceptions[k];
                    list[versionsInverted[k]] = val;
                    return list;
                },
                {}
            );
        }
        return map;
    }, {});
}

function packBrowserVersions(agents) {
    const browserVersions = Object.keys(agents)
        .reduce((map, key) => {
            const versions = Object.keys(agents[key].usage_global);
            versions.forEach(version => {
                const exists = map.find(v => v.version === version);
                if (exists) {
                    exists.count++;
                } else {
                    map.push({ version, count: 1 });
                }
            });
            return map;
        }, [])
        .sort((a, b) => b.count - a.count)
        .reduce((map, version, index) => {
            map[encode(index)] = version.version;
            return map;
        }, {});

    return writeFile(
        path.join(__dirname, `../../data/browserVersions.js`),
        stringifyObject(browserVersions)
    ).then(() => [agents, browserVersions]);
}

export default function packAgents() {
    // We're not requiring the JSON because it nukes the null values
    return fs
        .readFile(require.resolve('caniuse-db/data.json'), 'utf8')
        .then(JSON.parse)
        .then(prop('agents'))
        .then(packBrowserVersions)
        .then(data => {
            return fs
                .readFile(
                    require.resolve('caniuse-db/fulldata-json/data-2.0.json'),
                    'utf8'
                )
                .then(fullData => [data, JSON.parse(fullData).agents]);
        })
        .then(([[agents, versions], fullAgents]) => {
            return writeFile(
                path.join(__dirname, `../../data/agents.js`),
                stringifyObject(relevantKeys(versions, agents, fullAgents))
            );
        });
}
