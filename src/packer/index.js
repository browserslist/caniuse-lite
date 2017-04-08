import Listr from 'listr';
import packAgents from './agents';
import packBrowsers from './browsers';
import packFeature from './feature';
import packRegion from './region';

const tasks = new Listr([{
    title: 'Browsers - Mangle application name',
    task: packBrowsers,
}, {
    title: 'Browsers - Mangle version naming & agents usage',
    task: packAgents,
}, {
    title: 'Features - Mangle support data',
    task: packFeature,
}, {
    title: 'Regional - Mangle browser usage data',
    task: packRegion,
}]);

tasks.run().catch(err => console.error(err));
