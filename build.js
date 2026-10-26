const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const buildInfo = require('./scripts/build-info');

const root = __dirname;
function normalizeNewlines(source) {
    return String(source || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
const modules = ['src/config.js', 'src/i18n.js', 'src/genre-descriptions.js', 'src/auth.js', 'src/api.js', 'src/catalog.js', 'src/stream-resolver.js', 'src/aniskip.js', 'src/ui-utils.js', 'src/ui-episode-progress.js', 'src/ui-scale.js', 'src/ui-menu.js', 'src/yani-resolver.js', 'src/lampac-resolver.js', 'src/ui-media.js', 'src/ui-navigation.js', 'src/ui-section-state.js', 'src/ui-search.js', 'src/ui-catalog-filters.js', 'src/ui-catalog-controls.js', 'src/ui-video-data.js', 'src/ui-card-model.js', 'src/ui-card-renderers.js', 'src/ui-card-bind.js', 'src/ui-card-rails.js', 'src/ui-account-identity.js', 'src/ui-choice-panel.js', 'src/ui-tv-shell.js', 'src/ui-playback-history.js', 'src/ui-playback-preferences.js', 'src/ui-playback-menu.js', 'src/ui-playback-picker.js', 'src/ui-standard-card.js', 'src/ui-trailers.js', 'src/ui-schedule.js', 'src/ui-notifications.js', 'src/ui-auth.js', 'src/ui-status.js', 'src/ui-player.js', 'src/ui-native-playlist.js', 'src/ui-account-list-controls.js', 'src/ui-account-lists.js', 'src/ui-library.js', 'src/ui-home-sections.js', 'src/ui-home-insights.js', 'src/ui-collections.js', 'src/ui-releases.js', 'src/ui-recommendations.js', 'src/ui-updates.js', 'src/ui-translations.js', 'src/ui-detail.js', 'src/ui-home.js', 'src/ui-settings-page.js', 'src/ui.js'];
modules.splice(modules.indexOf('src/stream-resolver.js'), 0, 'src/episode.js');
modules.forEach((file) => execFileSync(process.execPath, ['--check', path.join(root, file)], {stdio: 'inherit'}));
const body = modules.map((file) => normalizeNewlines(fs.readFileSync(path.join(root, file), 'utf8'))).join('\n');
const css = normalizeNewlines(fs.readFileSync(path.join(root, 'style.css'), 'utf8'));

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--check')) throw new Error('Usage: node build.js [--check]');
const check = args.includes('--check');
const bundlePath = path.join(root, 'dist', 'index.js');
const recorded = check ? normalizeNewlines(fs.readFileSync(bundlePath, 'utf8')) : null;
const version = (body.match(/version:\s*'(\d+\.\d+\.\d+)'/) || [])[1];
if (!version) throw new Error('Plugin version is missing');
const info = check ? buildInfo.read(recorded) : buildInfo.create({root, version});
if (info.version !== version) throw new Error('Bundle metadata version differs from sources. Run node build.js');
const output = `function pluginYummyAnime() {
    if (window.plugin_yummy_anime_ready) return;
    window.plugin_yummy_anime_ready = true;

${buildInfo.block(info)}
    var style = document.createElement('style');
    style.textContent = ${JSON.stringify(css)};
    document.head.appendChild(style);

${body}
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
}

if (!window.plugin_yummy_anime_ready) pluginYummyAnime();
`;

const normalized = normalizeNewlines(output);
const manifest = JSON.stringify(info, null, 2) + '\n';
const metadataScript = buildInfo.script(info);
if (check) {
    if (recorded !== normalized) throw new Error('dist/index.js is out of date. Run node build.js and commit dist artifacts.');
    if (fs.readFileSync(path.join(root, 'dist', 'build-info.json'), 'utf8') !== manifest ||
        fs.readFileSync(path.join(root, 'dist', 'build-info.js'), 'utf8') !== metadataScript) {
        throw new Error('Build metadata artifacts differ from the bundle. Run node build.js');
    }
    console.log('Bundle and build metadata match sources');
} else {
    fs.mkdirSync(path.join(root, 'dist'), {recursive: true});
    fs.writeFileSync(bundlePath, normalized);
    fs.writeFileSync(path.join(root, 'dist', 'build-info.json'), manifest);
    fs.writeFileSync(path.join(root, 'dist', 'build-info.js'), metadataScript);
    console.log('Built dist/index.js (' + (info.shortCommit || 'unknown commit') + (info.dirty ? ' + local changes' : '') + ', ' + info.builtAt + ')');
}
