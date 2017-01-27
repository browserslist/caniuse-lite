const features = require('./data/features');
const dist = require('./dist');

Object.keys(features).forEach(function (key) {
    const feat = features[key];
    console.log(key, dist.feature(feat));
});
