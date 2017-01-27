import browsers from './browsersInverted';

export default function agentsPack (data) {
    const {agents} = data;

    return Object.keys(agents).reduce((map, key) => {
        const agent = agents[key];
        map[browsers[key]] = {
            1: agent.usage_global,
            2: agent.prefix,
            3: agent.prefix_exceptions,
        };
        return map;
    }, {})
    return agents;
}
