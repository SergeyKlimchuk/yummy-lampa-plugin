# Third-party notices and licensing scope

This inventory preserves known notices and records unresolved permissions. It is
not a declaration that the whole repository is MIT-licensed, and it does not
grant permission on behalf of upstream authors or third-party rights holders.
The component data used by the plugin's license screen is in [licenses.json](licenses.json).

| Component | Scope | License / status | Text |
| --- | --- | --- | --- |
| Historical YummyAnime plugin code | Material traceable to the last MIT snapshot, including retained portions of modified files | MIT, confirmed historical grant | [Original MIT notice](LICENSES/MIT-original.txt) |
| Original fork contributions | Contributions for which SergeyKlimchuk can grant permissions, excluding inherited material | MIT, limited to those contributions | [Fork MIT notice](LICENSES/MIT-fork.txt) |
| Later upstream changes | Upstream changes after removal of LICENSE, including code at the fork base | Permission not confirmed | No license is assigned here |
| Native Lampa source fixtures | `tests/fixtures/lampa-native`; no native player source in the production bundle | GPL version 2, following upstream LICENSE | [GPL text](LICENSES/GPL-2.0.txt) |
| Playwright 1.49.1 | Resolver dependency in `server/package.json`; not vendored or included in the plugin bundle | Apache-2.0 | [Official tag's license](LICENSES/Apache-2.0-Playwright.txt) |
| Logos, posters and third-party texts | Runtime content, screenshots and prototype samples | Respective rights holders' terms; permissions not established by this notice | No blanket asset license |

## Historical upstream MIT material

The upstream [snapshot 227ff5c98b97d95e744e8d3b2211e9debbcc04c2](https://github.com/yummyanime/yummy-lampa-plugin/tree/227ff5c98b97d95e744e8d3b2211e9debbcc04c2)
contains the original MIT license:

> Copyright (c) 2026 Andrew Rasskazoff Codeman

[LICENSES/MIT-original.txt](LICENSES/MIT-original.txt) preserves that file without
changes. It applies to material covered by the historical grant; it does not
establish a license for every current file or for later upstream additions.
Original fork contributions have their own MIT notice without replacing the
original author's copyright.

Upstream [removed LICENSE in commit 61977a0](https://github.com/yummyanime/yummy-lampa-plugin/commit/61977a0f81966bd7881956f7ef82ccae799cb9f6)
on 2026-08-13. The fork contains later additions and changes inherited at
[base d9cf256](https://github.com/yummyanime/yummy-lampa-plugin/tree/d9cf256500c5d0a1a75de66dbddcc949e997ab5d).
Their licensing is not established by the old MIT file or by this inventory.
Confirmation of the applicable license or permission for those contributions
must come from the relevant rights holders. No such permission is recorded here.

## Native Lampa fixtures

The exact fixture paths, source URLs, pinned commits and fetch dates are recorded
in [tests/fixtures/lampa-native/README.md](https://github.com/SergeyKlimchuk/yummy-lampa-plugin/blob/105ce86dc74ea8684c7de29e6a54bed8b60f017b/tests/fixtures/lampa-native/README.md)
and each source fixture's header. The Playlist and native selection handler use
upstream commit `616c80224518a7c7e04e2789d5811881b93bf611`; the Timeline fixture
uses `71733ed81f4b13ac1ed1b3328cbbaa7e01afdbd2`.

[LICENSES/GPL-2.0.txt](LICENSES/GPL-2.0.txt) is byte-for-byte identical to the
existing [fixture LICENSE](https://github.com/SergeyKlimchuk/yummy-lampa-plugin/blob/105ce86dc74ea8684c7de29e6a54bed8b60f017b/tests/fixtures/lampa-native/LICENSE). License
identification follows the upstream root LICENSE rather than a package metadata
label. The provenance headers describe the added fixture headers; the copied
native modules are test inputs, not player code vendored into `dist/index.js`.
This scoped notice does not automatically assign GPL to the entire plugin.

## Playwright and browser downloads

The self-hosted resolver declares `playwright` version `1.49.1` and its
`postinstall` command downloads Chromium. The license copy is taken unchanged
from the official [Playwright v1.49.1 LICENSE](https://github.com/microsoft/playwright/blob/v1.49.1/LICENSE),
including the Microsoft and Google copyright statements.

Playwright, its installed dependencies and downloaded browsers are not committed
to this repository or included in its browser plugin/Pages artifact. This entry
is not an exhaustive inventory of their transitive licenses. If a ready-to-run
resolver package, container or browser binary is distributed, its included
components' own licenses and applicable third-party notices must accompany it.

## Third-party visual and textual material

Logos, posters and texts from third-party sources belong to their respective
rights holders. The fork's authors do not claim rights to those materials.
This ownership statement is not a license grant or evidence of permission,
and it does not replace image-specific author/license attribution.

The official YummyAnime logo's source and packaging are recorded in
[docs/mockups/sources.json](docs/mockups/sources.json). The public API snapshots,
synthetic account examples and screenshots are described in the
[prototype README](docs/mockups/README.md) and [project README](README.md).
Their provenance is documented, but this repository has not established a blanket
redistribution permission for the underlying logos, illustrations or texts.

The runtime Wikimedia fallback in `src/ui-media.js` loads subject images for
studios/directors by URL but does not yet preserve the creator and license
metadata required for some files. Commons permits hotlinking subject to the
[individual files' conditions](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/technical#Hotlinking).
That remaining attribution issue is not resolved by adding this notice.

## Copies and distribution

Retain the applicable copyright and license texts when distributing covered
material. The license UI is an additional access point, not a replacement for
notices accompanying a separately downloadable JavaScript bundle. The build and
Pages packaging use this registry and the canonical license files; unresolved
entries remain explicitly unconfirmed rather than being labelled MIT.
