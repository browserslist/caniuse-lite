# caniuse-lite

> A smaller version of caniuse-db, with only the essentials!

## Why?

The full data behind [Can I use][1] is incredibly useful for any front end
developer, and on the website all of the details from the database are displayed
to the user. However in automated tools, [many of these fields go unused][2];
it's not a problem for server side consumption but client side, the less
JavaScript that we send to the end user the better.

caniuse-lite then, is a smaller dataset that keeps the essential parts of the
original, and then packs those parts down on disk. So for example, the original
database stores support for a feature as a string, e.g. `"y"`, whereas
caniuse-lite uses integers. These integers are then converted back to strings
by using the appropriate conversion methods exposed by this module.


## API

```js
import * as lite from 'caniuse-lite';
```

### `lite.agents`

caniuse-db provides the `agents` key in the full `data.json`, which includes
all of the data. caniuse-lite provides this data instead, which has the
`usage_global`, `prefix` and `prefix_exceptions` keys from the original. Note
that the `versions` key is also included, but unlike caniuse-db, there are no
`null` values included with this data.

### `lite.feature(json)`

The `feature` method takes a file from `data/features-json` and converts it
into something that more closely represents the `caniuse-db` format. Note that
only the `stats` and `status` keys are kept from the original data.

### `lite.features`

The `features` index is provided as a way to query all of the features that
are listed in the `caniuse-db` dataset. You should probably pair this index
with the `feature` method to get something more human-readable.

### `lite.region(json)`

The `region` method takes a file from `data/region-usage-json` and converts it
into something that more closely represents the `caniuse-db` format. Note that
*only* the usage data is exposed here (the `data` key in the original files),
with any `null` values removed.


## Contributors

Thanks goes to these wonderful people ([emoji key](https://github.com/kentcdodds/all-contributors#emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
| [<img src="https://avatars.githubusercontent.com/u/1282980?v=3" width="100px;"/><br /><sub>Ben Briggs</sub>](http://beneb.info)<br />[💻](https://github.com/ben-eb/caniuse-lite/commits?author=ben-eb) [📖](https://github.com/ben-eb/caniuse-lite/commits?author=ben-eb) 👀 [⚠️](https://github.com/ben-eb/caniuse-lite/commits?author=ben-eb) | [<img src="https://avatars.githubusercontent.com/u/1737375?v=3" width="100px;"/><br /><sub>Andy Jansson</sub>](https://github.com/andyjansson)<br />[💻](https://github.com/ben-eb/caniuse-lite/commits?author=andyjansson) |
| :---: | :---: |
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/kentcdodds/all-contributors) specification. Contributions of any kind welcome!

## License

The data in this repo is available for use under a CC BY 4.0 license
(http://creativecommons.org/licenses/by/4.0/). For attribution just mention
somewhere that the source is caniuse.com. If you have any questions about using
the data for your project please contact me here: http://a.deveria.com/contact

[1]: http://caniuse.com/
[2]: https://github.com/Fyrd/caniuse/issues/1827
