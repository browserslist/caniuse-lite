import fs from 'mz/fs';
import writeFile from 'write-file-promise';
import path from 'path';
import * as R from 'ramda';
import stringifyObject from '../lib/stringifyObject';
import { encode } from '../lib/base62';

const browsersData = require('../../data/browsers');
const browsers = R.invertObj(browsersData);

function relevantKeys(agents, versions, fullAgents) {
    const versionsInverted = R.invertObj(versions);
    return Object.keys(agents).reduce((map, key) => {
        const agent = agents[key];
        map[browsers[key]] = {
            A: Object.keys(agent.usage_global).reduce((list, k) => {
                const val = agent.usage_global[k];
                list[versionsInverted[k]] = val;
                return list;
            }, {}),
            B: agent.prefix,
            C: R.compose(
                R.unnest,
                R.map(
                    R.ifElse(
                        R.equals(null),
                        R.always(''),
                        R.flip(R.prop)(versionsInverted)
                    )
                )
            )(agent.versions),
            E: agent.browser,
            F: fullAgents[key].version_list.reduce((map, item) => {
                map[versionsInverted[item.version]] = item.release_date;
                return map;
            }, {}),
        };
        if (agent.prefix_exceptions) {
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
        path.join(__dirname, '..', '..', 'data', 'browserVersions.js'),
        stringifyObject(browserVersions)
    ).then(() => [agents, browserVersions]);
}

const getAgents = R.compose(R.prop('agents'), JSON.parse);

export default function packAgents() {
    // We're not requiring the JSON because it nukes the null values
    return Promise.all([
        fs
            .readFile(require.resolve('caniuse-db/data.json'), 'utf8')
            .then(getAgents)
            .then(packBrowserVersions),
        fs
            .readFile(
                require.resolve('caniuse-db/fulldata-json/data-2.0.json'),
                'utf8'
            )
            .then(getAgents),
    ])
        .then(R.flatten)
        .then(R.apply(relevantKeys))
        .then(stringifyObject)
        .then(
            writeFile.bind(
                null,
                path.join(__dirname, '..', '..', 'data', 'agents.js')
            )
        );
}
