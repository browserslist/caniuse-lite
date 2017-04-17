# 1.x releases

The contents of this section have been generated automatically; each version
tracks the `caniuse-db` package at the same version.

# 0.3.0

-   Add the `title` key to each feature.
-   Update `caniuse-db` to `1.0.30000653`.
-   Test automated publish script.

# 0.2.0

-   Rewrite of the module. Now tries to be less clever with version merging,
    instead opting for base62 identifiers for versions, and it is now tested
    for accuracy against the original data.
-   `null` versions are now preserved to be consistent with caniuse-db.
-   All data is now stored as JS objects rather than JSON.
-   The browser map is now automatically generated.

# 0.1.0

-   Initial release.
