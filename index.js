function pluginYummyAnime() {
    'use strict';

    if (window.plugin_yummy_anime_ready) return;
    window.plugin_yummy_anime_ready = true;

    // This entry loads source modules, so it must not claim a bundle's build time.
    window.LampaYaniBuild = {commit: null, shortCommit: null, builtAt: null, dirty: null, channel: 'development'};

    var scripts = [
        'src/config.js',
        'src/i18n.js',
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
        'src/ui-player.js',
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
