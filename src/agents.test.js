const { agents } = require('./unpacker/agents')

it('should be 1:1', () => {
  let fulldata = require('caniuse-db/data.json').agents
  Object.keys(agents).forEach(key => {
    let data = agents[key]
    expect(data.usage_global).toEqual(fulldata[key].usage_global)
    expect(data.prefix).toEqual(fulldata[key].prefix)
    expect(data.versions).toEqual(fulldata[key].versions)
    expect(data.prefix_exceptions).toEqual(fulldata[key].prefix_exceptions)
    expect(data.browser).toEqual(fulldata[key].browser)
  })
})

it('should properly process release dates', () => {
  let fulldata = require('caniuse-db/fulldata-json/data-2.0.json')
  Object.keys(agents).forEach(key => {
    let data = agents[key]
    fulldata.agents[key].version_list.forEach(({ version, release_date }) => {
      expect(data.release_date[version]).toEqual(release_date)
    })
  })
})
