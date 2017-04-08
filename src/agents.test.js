import {agents} from './unpacker/agents';

it('should be 1:1', () => {
    const fulldata = require('caniuse-db/data.json').agents;
    Object.keys(agents).forEach(key => {
        const data = agents[key];
        expect(data.usage_global).toEqual(fulldata[key].usage_global);
        expect(data.prefix).toEqual(fulldata[key].prefix);
        expect(data.versions).toEqual(fulldata[key].versions);
        expect(data.prefix_exceptions).toEqual(fulldata[key].prefix_exceptions);
    });
});
