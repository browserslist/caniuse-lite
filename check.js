const { writeFile } = require('fs')
const { get } = require('https')
const bcd = require('@mdn/browser-compat-data')

const pkg = require('./package.json')

get('https://registry.npmjs.org/caniuse-db', res => {
  if (res.statusCode < 200 || res.statusCode >= 299) {
    process.stderr.write(`${res.statusCode} response from npm\n`)
    process.exit(1)
  }

  let data = ''
  res.on('data', chunk => {
    data += chunk
  })
  res.on('end', () => {
    let body = JSON.parse(data)
    let lastVersion = body['dist-tags'].latest
    if (pkg.devDependencies['caniuse-db'] !== lastVersion) {
      pkg.version = lastVersion
      pkg.devDependencies['caniuse-db'] = lastVersion
      writeFile('./package.json', `${JSON.stringify(pkg, null, 2)}\n`, () => {
        process.stdout.write('::set-output name=newVersion::1\n')
      })
    } else {
      process.stdout.write('Already up to date\n')
    }
  })
})

const autofillData = bcd.css.selectors.autofill.__compat

function bcdBrowserToCanIUseBrowser(bcdBrowser) {
  let browser = bcdBrowser

  if (browser === 'samsunginternet_android') {
    browser = 'samsung'
  } else if (browser === 'safari_ios') {
    browser = 'ios_saf'
  } else if (browser === 'opera_android') {
    browser = 'op_mob'
  } else if (browser === 'chrome_android') {
    browser = 'and_chr'
  } else if (browser === 'firefox_android') {
    browser = 'and_ff'
  } else if (browser === 'webview_android') {
    browser = 'android'
  }

  return browser
}

let result = {
  title: ':autofill CSS pseudo-class',
  spec: autofillData.spec_url,
  stats: {}
}

let autofillSupportData = autofillData.support

Object.keys(autofillSupportData).forEach(browser => {
  let browserDataRaw = autofillSupportData[browser]
  let browserData

  if (Array.isArray(browserDataRaw)) {
    if (browserDataRaw[0].version_added === 'preview') {
      browserData = browserDataRaw[1]
    } else {
      browserData = browserDataRaw[0]
    }
  } else {
    browserData = browserDataRaw
  }

  if (
    browserData.version_added !== 'preview' &&
    !browserData.partial_implementation
  ) {
    result.stats[bcdBrowserToCanIUseBrowser(browser)] = {}
    Object.keys(bcd.browsers[browser].releases).forEach(version => {
      let supported =
        parseFloat(version) >= parseFloat(browserData.version_added)
      supported &&= !browserData.prefix
      supported &&= browserData.version_added

      result.stats[bcdBrowserToCanIUseBrowser(browser)][version] = supported
        ? 'y'
        : 'n'
    })
  }
})

console.log(JSON.stringify(result))
