const features = require('./data/features');
const lite = require('./dist/unpacker');

Object.keys(features).forEach(function (key) {
    const feat = features[key];
    console.log(key, lite.feature(feat));
});
