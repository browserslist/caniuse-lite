const bcd = require('@mdn/browser-compat-data')
const { writeFileSync } = require('fs')

/**
 * This function maps the browser keys from @mdn/browser-compat-data, to caniuse's format.
 */
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

/**
 * This function maps support data from @mdn/browser-compat-data, to caniuse's
 * format.
 */
function bcdDataToCanIUseData(bcdData, title) {
  let result = {
    title,
    spec: bcdData.spec_url,
    stats: {}
  }

  let supportData = bcdData.support

  Object.keys(supportData).forEach(browser => {
    let browserDataRaw = supportData[browser]
    let browserData

    // Browser support data in BCD can either be an object or an array.
    if (Array.isArray(browserDataRaw)) {
      /*
       If the first entry in the array has a version added of "preview" we want to get the second entry.
       This allows us to ignore browsers such as Safari Tech Preview.
       */
      if (browserDataRaw[0].version_added === 'preview') {
        browserData = browserDataRaw[1]
      } else {
        browserData = browserDataRaw[0]
      }
    } else {
      // If it's not an array it's already in the correct format to process.
      browserData = browserDataRaw
    }

    result.stats[bcdBrowserToCanIUseBrowser(browser)] = {}
    // Loop through all versions for the current browser
    Object.keys(bcd.browsers[browser].releases).forEach(version => {
      /**
       * Feature is supported when:
       * The BCD version isn't null or false (it exists)
       * The BCD version isn't "preview", used for preview browsers such as Safari TP.
       * The current version is greater than or equal to the BCD version.
       * There's no prefix information in the BCD entry.
       * There's no flag information in the BCD entry.
       * The implementation isn't marked as partial.
       */
      let supported = browserData.version_added
      supported &&= browserData.version_added !== 'preview'
      supported &&= parseFloat(version) >= parseFloat(browserData.version_added)
      supported &&= !browserData.prefix
      supported &&= !browserData.flags
      supported &&= !browserData.partial_implementation

      // This adds to the output data in the required format.
      result.stats[bcdBrowserToCanIUseBrowser(browser)][version] = supported
        ? 'y'
        : 'n'
    })
  })

  return result
}

const autofillData = bcdDataToCanIUseData(
  bcd.css.selectors.autofill.__compat,
  ':autofill CSS pseudo-class'
)

writeFileSync(
  './node_modules/caniuse-db/features-json/css-autofill.json',
  JSON.stringify(autofillData)
)
