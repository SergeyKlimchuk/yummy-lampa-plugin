# Build identity

The bundled plugin shows **Settings → YummyAnime → Build information**: version, source commit, build time in UTC, local changes and build channel. Russian UI: **Настройки → YummyAnime → О сборке**.

`node build.js` captures the actual assembly time and the source revision. Local builds use Git HEAD and indicate uncommitted changes. Generated `dist/index.js`, `dist/build-info.json` and `dist/build-info.js` do not make their own source dirty. In GitHub Actions the stamp uses the checked-out workflow revision (`GITHUB_SHA`). Missing Git information stays unknown; opening Settings never substitutes the current time.

The same metadata is embedded in `dist/index.js`, exported as JSON in `dist/build-info.json`, and provided as `window.LampaYaniBuild` by `dist/build-info.js` for the local UX preview. The source-module loader `index.js` is explicitly marked as development and does not claim the bundled artifact's commit/time.

## Verification and deployment

```sh
node build.js
node build.js --check
```

Commit all three generated `dist` artifacts with source changes. `--check` reuses the recorded stamp while comparing the **entire bundle content** with current sources and checks that the manifests match. It does not write files or regenerate timestamps. This avoids treating a fresh timestamp or new commit ID as a source mismatch.

CI checks the committed bundle first, then rebuilds with that run's revision and actual time. GitHub Pages publishes the stamped `dist` directory. It also publishes `src` and `docs`, so the source loader and interactive UX proposal have their required files. Publishing the proposal does not replace the working plugin interface.

For this fork, the current development build URL is:

- [Plugin](https://sergeyklimchuk.github.io/yummy-lampa-plugin/dist/index.js)
- [Build manifest](https://sergeyklimchuk.github.io/yummy-lampa-plugin/dist/build-info.json)
- [UX proposal](https://sergeyklimchuk.github.io/yummy-lampa-plugin/docs/mockups/tv-next/index.html)

These files appear or change only after the corresponding commit is pushed and its Pages deployment succeeds. `stable/index.js` is a separate promoted release and is not replaced by a normal `main` deployment. The upstream `yummyanime.github.io` address belongs to the original repository and does not receive changes from this fork.
