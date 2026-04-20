'use strict'

let features = require('./data/features')
let lite = require('./dist/unpacker')

Object.keys(features).forEach(key => {
  let feat = features[key]
  console.log(key, lite.feature(feat))
})
