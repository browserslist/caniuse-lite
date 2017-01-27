import browsers from './browsers';

/*
 * Load this dynamically so that it
 * doesn't appear in the rollup bundle.
 */

const agentsJson = require('../data/agents.json');

const keys = {
    1: 'usage_global',
    2: 'prefix',
    3: 'prefix_exceptions'
};

export const agents = Object.keys(agentsJson).reduce((map, key) => {
    map[browsers[key]] = Object.keys(agentsJson[key]).reduce((data, entry) => {
        data[keys[entry]] = agentsJson[key][entry];
        return data;
    }, {versions: Object.keys(agentsJson[key][1])});
    return map;
}, {});
