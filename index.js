/* YUMMY_LICENSE_NOTICES_START
YummyAnime Lampa: scoped license notices.
Historical upstream code: MIT, with its original copyright notice below.
Later upstream additions have unconfirmed licensing; these notices do not grant rights to them.
Third-party logos, posters and texts retain their separate rights and are not covered by these MIT grants.
See LICENSE, licenses.json and THIRD_PARTY_NOTICES.md for scope, sources and limitations.

--- Historical upstream MIT notice ---
MIT License

Copyright (c) 2026 Andrew Rasskazoff Codeman

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

--- MIT applies only to the fork contributions identified in LICENSE; it does not relicense upstream additions ---
MIT License

Copyright (c) 2026 SergeyKlimchuk

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
YUMMY_LICENSE_NOTICES_END */
function pluginYummyAnime() {
    'use strict';

    if (window.plugin_yummy_anime_ready) return;
    window.plugin_yummy_anime_ready = true;

    // This entry loads source modules, so it must not claim a bundle's build time.
    window.LampaYaniBuild = {commit: null, shortCommit: null, builtAt: null, dirty: null, channel: 'development'};

    var scripts = [
        'src/config.js',
        'src/i18n.js',
        'src/license-data.js',
        'src/genre-descriptions.js',
        'src/auth.js',
        'src/api.js',
        'src/catalog.js',
        'src/episode.js',
        'src/stream-resolver.js',
        'src/aniskip.js',
        'src/ui-utils.js',
        'src/ui-episode-progress.js',
        'src/ui-scale.js',
        'src/ui-menu.js',
        'src/yani-resolver.js',
        'src/lampac-resolver.js',
        'src/ui-media.js',
        'src/ui-navigation.js',
        'src/ui-section-state.js',
        'src/ui-search.js',
        'src/ui-catalog-filters.js',
        'src/ui-catalog-controls.js',
        'src/ui-video-data.js',
        'src/ui-card-model.js',
        'src/ui-card-renderers.js',
        'src/ui-card-bind.js',
        'src/ui-card-rails.js',
        'src/ui-account-identity.js',
        'src/ui-choice-panel.js',
        'src/ui-tv-shell.js',
        'src/ui-playback-history.js',
        'src/ui-playback-preferences.js',
        'src/ui-playback-menu.js',
        'src/ui-playback-picker.js',
        'src/ui-standard-card.js',
        'src/ui-trailers.js',
        'src/ui-schedule.js',
        'src/ui-notifications.js',
        'src/ui-auth.js',
        'src/ui-status.js',
        'src/ui-player.js', 'src/ui-native-playlist.js',
        'src/ui-account-list-controls.js',
        'src/ui-account-lists.js',
        'src/ui-library.js',
        'src/ui-home-sections.js',
        'src/ui-home-insights.js',
        'src/ui-collections.js',
        'src/ui-releases.js',
        'src/ui-recommendations.js',
        'src/ui-updates.js',
        'src/ui-translations.js',
        'src/ui-detail.js',
        'src/ui-home.js',
        'src/ui-settings-page.js',
        'src/ui-licenses.js',
        'src/ui.js'
    ];
    var current = document.currentScript;
    var base = current && current.src ? current.src.substring(0, current.src.lastIndexOf('/') + 1) :
        'https://raw.githubusercontent.com/yummyanime/yummy-lampa-plugin/main/';

    function load(i) {
        if (i >= scripts.length) {
            if (window.Lampa && Lampa.Manifest && window.LampaYaniConfig) {
                Lampa.Manifest.plugins = {
                    type: 'other',
                    version: LampaYaniConfig.version,
                    name: 'YummyAnime',
                    author: 'YummyAnime',
                    description: 'YummyAnime catalog, ratings, lists and account integration',
                    component: 'yani_home'
                };
            }
            try {
                window.LampaYani.register();
            } catch (error) {
                console.error('[YummyAnime] Plugin initialization failed', error);
            }
            return;
        }

        var tag = document.createElement('script');
        tag.src = base + scripts[i];
        tag.onload = function () { load(i + 1); };
        tag.onerror = function () { console.error('[Lampa Yani] Failed to load ' + scripts[i]); };
        document.head.appendChild(tag);
    }

    var style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = base + 'style.css';
    document.head.appendChild(style);

    load(0);
}

if (!window.plugin_yummy_anime_ready) pluginYummyAnime();
