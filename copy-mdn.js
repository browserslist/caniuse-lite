const bcd = require('@mdn/browser-compat-data')
const { writeFileSync } = require('fs')
const R = require('ramda')

const versions = require('./data/browserVersions')

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
 *
 * If versionAdded is a range take the upper end of the range as the value.
 *
 * Version matches if all are true:
 * The versionAdded isn't null or false (it exists)
 * The versionAdded isn't "preview", used for preview browsers such as Safari TP.
 * The versionAdded is true
 * The current version is greater than or equal to the versionAdded.
 * The current version is less than the BCD version_Removed if exists.
 */
function versionMatches(browserVersion, versionAdded, versionRemoved) {
  if (versionAdded === 'preview' || !versionAdded) {
    return false
  }

  if (typeof versionAdded === 'string' && versionAdded.includes('≤')) {
    versionAdded = versionAdded.version_added.replace('≤', '')
  }

  let versionIsGreaterOrEqualToVersionAdded =
    parseFloat(browserVersion) >= parseFloat(versionAdded)

  /**
   * BCD data occasionally uses true for version_added.
   * This is generally when the feature has been supported for so long that it's unknown when it was supported.
   * Here we just treat this as supported.
   */
  versionIsGreaterOrEqualToVersionAdded ||= versionAdded === true

  let versionIsLessThanVersionRemoved =
    !versionRemoved || parseFloat(browserVersion) < parseFloat(versionRemoved)

  return (
    versionIsGreaterOrEqualToVersionAdded && versionIsLessThanVersionRemoved
  )
}

/**
 * This function maps support data from @mdn/browser-compat-data, to caniuse's
 * format.
 */
function bcdDataToCanIUseData(bcdData, title) {
  let result = {
    title,
    spec: bcdData.spec_url,
    stats: {},
    status: 'other'
  }

  let supportData = bcdData.support

  Object.keys(supportData).forEach(browser => {
    let browserDataRaw = supportData[browser]

    result.stats[bcdBrowserToCanIUseBrowser(browser)] = {}
    // Loop through all versions for the current browser
    Object.keys(bcd.browsers[browser].releases).forEach(version => {
      let versionsInverted = R.invertObj(versions)

      if (!versionsInverted[version]) {
        return
      }

      let browserData

      // Browser support data in BCD can either be an object or an array.
      if (!Array.isArray(browserDataRaw)) {
        // If it's not an array it's already in the correct format to process.
        browserData = browserDataRaw
      } else {
        // This allows us to ignore preview browsers such as Safari Tech Preview.
        browserDataRaw = browserDataRaw.filter(
          entry => entry.version_added !== 'preview'
        )

        if (browserDataRaw.length === 1) {
          browserData = browserDataRaw[0]
        } else {
          for (let entry of browserDataRaw) {
            let versionMatch = versionMatches(
              version,
              entry.version_added,
              entry.version_removed
            )

            if (!versionMatch) continue

            // If fully supported unprefixed
            if (
              !entry.flags &&
              !entry.partial_implementation &&
              !entry.prefix
            ) {
              browserData = entry
              break
            }

            let nonFlaggedDataIndex = browserDataRaw.findIndex(e1 => !e1.flags)
            let nonPartial = browserDataRaw.findIndex(
              e2 => !e2.flags && !e2.partial_implementation
            )

            if (entry.flags && nonFlaggedDataIndex !== -1) {
              // Prefer non-flagged over flagged data
              continue
            }

            if (entry.partial_implementation && nonPartial) {
              // Prefer non-partial over partial data
              continue
            }

            browserData = entry
          }

          if (!browserData) {
            browserData = {
              version_added: false
            }
          }
        }
      }

      /**
       * Feature is supported when:
       * The version matches
       * There's no flag information in the BCD entry.
       */
      let supported =
        versionMatches(
          version,
          browserData.version_added,
          browserData.version_removed
        ) && !browserData.flags

      let value = 'n'
      if (browserData.partial_implementation && supported) {
        value = 'a'
      } else if (supported) {
        value = 'y'
      }

      if (browserData.prefix) {
        value += ' x'
      }

      // This adds to the output data in the required format.
      result.stats[bcdBrowserToCanIUseBrowser(browser)][version] = value
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
