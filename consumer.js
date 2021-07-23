'use strict'

const features = require('./data/features')
const lite = require('./dist/unpacker')

Object.keys(features).forEach(key => {
  let feat = features[key]
  console.log(key, lite.feature(feat))
})
