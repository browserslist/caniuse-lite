const { writeFileSync } = require('fs')
const { agents } = require('caniuse-db/data.json')
const bcd = require('@mdn/browser-compat-data')

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

let unknown = {}

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
    let caniuseBrowser = bcdBrowserToCanIUseBrowser(browser)

    if (!agents[caniuseBrowser]) {
      if (!unknown[caniuseBrowser]) {
        unknown[caniuseBrowser] = true
        console.warn(`Unknown browser ${caniuseBrowser}`)
      }
      return
    }

    result.stats[caniuseBrowser] = {}
    // Loop through all versions for the current browser
    agents[caniuseBrowser].versions.forEach(version => {
      if (!version) return

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
              !entry.prefix &&
              !entry.alternative_name
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

      let supported =
        !browserData.flags &&
        versionMatches(
          version,
          browserData.version_added,
          browserData.version_removed
        )

      let value = 'n'
      if (browserData.partial_implementation && supported) {
        value = 'a'
      } else if (supported) {
        value = 'y'
      }

      if (
        value !== 'n' &&
        (browserData.prefix || browserData.alternative_name)
      ) {
        value += ' x'
      }

      result.stats[caniuseBrowser][version] = value
    })
  })

  return result
}

const features = './node_modules/caniuse-db/features-json/'

const autofillData = bcdDataToCanIUseData(
  bcd.css.selectors.autofill.__compat,
  ':autofill CSS pseudo-class'
)
writeFileSync(features + 'css-autofill.json', JSON.stringify(autofillData))

const fileSelectorButtonData = bcdDataToCanIUseData(
  bcd.css.selectors['file-selector-button'].__compat,
  '::file-selector-button CSS pseudo-element'
)
writeFileSync(
  features + 'css-file-selector-button.json',
  JSON.stringify(fileSelectorButtonData)
)

const stretchData = bcdDataToCanIUseData(
  bcd.css.properties.width.stretch.__compat,
  'width: stretch property'
)
writeFileSync(features + 'css-width-stretch.json', JSON.stringify(stretchData))

const printColorAdjustData = bcdDataToCanIUseData(
  bcd.css.properties['print-color-adjust'].__compat,
  'print-color-adjust property'
)
writeFileSync(
  features + 'css-print-color-adjust.json',
  JSON.stringify(printColorAdjustData)
)

const unicodeBidiIsolate = bcdDataToCanIUseData(
  bcd.css.properties['unicode-bidi'].isolate.__compat,
  'isolate from unicode-bidi'
)
writeFileSync(
  features + 'mdn-css-unicode-bidi-isolate.json',
  JSON.stringify(unicodeBidiIsolate)
)

const unicodeBidiPlaintext = bcdDataToCanIUseData(
  bcd.css.properties['unicode-bidi'].plaintext.__compat,
  'plaintext from unicode-bidi'
)
writeFileSync(
  features + 'mdn-css-unicode-bidi-plaintext.json',
  JSON.stringify(unicodeBidiPlaintext)
)

const unicodeBidiIsolateOverride = bcdDataToCanIUseData(
  bcd.css.properties['unicode-bidi']['isolate-override'].__compat,
  'isolate-override from unicode-bidi'
)
writeFileSync(
  features + 'mdn-css-unicode-bidi-isolate-override.json',
  JSON.stringify(unicodeBidiIsolateOverride)
)

const textDecorationColorData = bcdDataToCanIUseData(
  bcd.css.properties['text-decoration-color'].__compat,
  'text-decoration-color property'
)
writeFileSync(
  features + 'mdn-text-decoration-color.json',
  JSON.stringify(textDecorationColorData)
)

const textDecorationLineData = bcdDataToCanIUseData(
  bcd.css.properties['text-decoration-line'].__compat,
  'text-decoration-line property'
)
writeFileSync(
  features + 'mdn-text-decoration-line.json',
  JSON.stringify(textDecorationLineData)
)

const textDecorationStyleData = bcdDataToCanIUseData(
  bcd.css.properties['text-decoration-style'].__compat,
  'text-decoration-style property'
)
writeFileSync(
  features + 'mdn-text-decoration-style.json',
  JSON.stringify(textDecorationStyleData)
)

const textDecorationShorthandData = bcdDataToCanIUseData(
  bcd.css.properties['text-decoration'].shorthand.__compat,
  'text-decoration shorthand property'
)
writeFileSync(
  features + 'mdn-text-decoration-shorthand.json',
  JSON.stringify(textDecorationShorthandData)
)
