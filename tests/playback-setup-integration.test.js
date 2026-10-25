'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const modules = ['episode.js', 'ui-utils.js', 'ui-playback-preferences.js', 'ui-playback-menu.js']
    .map(name => fs.readFileSync('src/' + name, 'utf8')).join('\n');
const card = {yani_id: 42, title: 'Fixture anime'};
const clone = value => JSON.parse(JSON.stringify(value));
function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return {promise, resolve, reject};
}
async function settle() { for (let turn = 0; turn < 8; turn++) await Promise.resolve(); }
function video(id, number, voice, player) {
    return {video_id: id, number, iframe_url: 'https://media.example/' + id,
        data: {dubbing: voice, player, player_id: player.toLowerCase()}};
}
const fixture = [
    video('studio-k1', '1', 'Studio Band', 'Kodik'),
    video('studio-k2', '2', 'Studio Band', 'Kodik'),
    video('libria-k1', '1', 'AniLibria', 'Kodik'),
    video('libria-k2', '2', 'AniLibria', 'Kodik'),
    video('libria-s1', '1', 'AniLibria', 'Sibnet'),
    video('libria-c1', '1', 'AniLibria', 'CVH')
];
fixture[3].data = JSON.stringify(fixture[3].data);

function environment(options) {
    options = options || {};
    const store = {}, pickers = [], launches = [], selects = [], notices = [], errors = [], restores = [];
    const direct = {internal: [], external: []}, loads = {start: 0, stop: 0};
    const disabled = new Set(), timers = new Map(), requests = [];
    let timerId = 0, origin = {component: 'yani_detail', id: 42};
    let history = options.history || null, videos = clone(options.videos || fixture);
    let target = options.target || 'internal', external = Boolean(options.external);
    const context = {
        console: {log() {}, warn() {}, error: (...args) => errors.push(args)},
        Promise, URL,
        setTimeout: fn => { const id = ++timerId; timers.set(id, fn); return id; },
        clearTimeout: id => timers.delete(id),
        document: {querySelector: () => null, documentElement: {contains: () => false}},
        $: () => ({length: 0, closest: () => ({length: 0})}),
        Lampa: {
            Storage: {get: (key, fallback) => key in store ? store[key] : fallback, set: (key, value) => { store[key] = value; }},
            Activity: {active: () => origin}, Select: {show() {}},
            Loading: {start: () => loads.start++, stop: () => loads.stop++},
            Noty: {show: message => notices.push(message)},
            Controller: {toggle: (...args) => restores.push(args), collectionSet() {}, collectionFocus() {}}
        }
    };
    context.window = context;
    vm.runInNewContext(modules, context);
    const preferences = context.LampaYaniPlaybackPreferences;
    const menu = context.LampaYaniPlaybackMenu.create({
        t: key => key,
        preferences,
        openPicker: (...args) => pickers.push(args),
        showYummySelect: params => { selects.push(params); return true; },
        getPlayback: () => history,
        loadVideos: id => {
            if (!options.pending) return Promise.resolve({response: clone(videos)});
            const request = deferred(); requests.push({id, ...request}); return request.promise;
        },
        playbackSourceId: preferences.source,
        isPlaybackSourceEnabled: source => !disabled.has(source),
        playerMatchesPreference: (group, preferred) => Boolean(preferred) && preferences.source(group) === preferred,
        launchVideo: (...args) => launches.push(args),
        playbackTargetPreference: () => target,
        androidExternalPlayerAvailable: () => external,
        openExternalPlayer: (...args) => { direct.external.push(args); return true; },
        playInternalPlayer: (...args) => { direct.internal.push(args); return true; }
    });
    return {menu, preferences, store, pickers, launches, selects, notices, errors, restores, timers, requests, disabled, direct, loads,
        changeOrigin: value => { origin = value; },
        setHistory: value => { history = value; },
        setTarget: value => { target = value; },
        allowExternal: value => { external = value; }};
}

(async function () {
    let env = environment();
    env.preferences.setDefaults({voice: 'AniLibria', source: 'sibnet'});
    env.menu.openVideos(card, false); await settle();
    assert.equal(env.pickers.length, 1);
    assert.equal(env.launches.length, 0, 'opening playback setup must not start video');
    let selection = env.pickers[0][2];
    assert.equal(selection.group.title, 'AniLibria');
    assert.equal(env.preferences.source(selection.group), 'sibnet');
    assert.equal(selection.origin, 'default');
    assert.equal(selection.unavailable, false);
    assert.equal(env.preferences.saved(card), null, 'automatic preselection must not become an explicit title override');

    const studio = env.pickers[0][1].find(group => group.title === 'Studio Band');
    env.preferences.remember(card, studio);
    env.menu.openVideos(card, false); await settle();
    selection = env.pickers[1][2];
    assert.equal(selection.origin, 'anime');
    assert.equal(selection.group.title, 'Studio Band', 'a title choice overrides global defaults');
    env.menu.openVideos({yani_id: 43, title: 'Another anime'}, false); await settle();
    assert.equal(env.pickers[2][2].group.title, 'AniLibria', 'a title override does not leak to another anime');
    assert.equal(env.preferences.source(env.pickers[2][2].group), 'sibnet');

    env = environment();
    env.preferences.setDefaults({voice: 'AniLibria', source: 'cvh'});
    env.disabled.add('cvh');
    env.menu.openVideos(card, false); await settle();
    const available = env.pickers[0][1]; selection = env.pickers[0][2];
    assert.ok(available.every(group => env.preferences.source(group) !== 'cvh'), 'disabled sources are removed before resolving preferences');
    assert.equal(selection.group.title, 'AniLibria', 'a disabled preferred provider can retain its available dub');
    assert.notEqual(env.preferences.source(selection.group), 'cvh');
    assert.equal(selection.unavailable, true, 'the setup must disclose that the preferred combination was unavailable');
    assert.equal(env.preferences.defaults().source, 'cvh', 'fallback must not overwrite the configured provider');

    env = environment({videos: fixture.slice(0, 2)});
    env.menu.openVideos(card, false); await settle();
    assert.equal(env.pickers.length, 1, 'even a single dub/source opens the new setup');
    assert.equal(env.pickers[0][1].length, 1);
    assert.equal(env.launches.length, 0, 'a single group does not bypass the setup and autoplay');

    const oldHistory = {number: '02', video_id: 'studio-k2', voice: 'Studio Band', player: 'kodik', time: 321, duration: 1440};
    env = environment({history: oldHistory});
    env.preferences.setDefaults({voice: 'AniLibria', source: 'kodik'});
    env.menu.openVideos(card, true); await settle();
    assert.equal(env.pickers.length, 0);
    assert.equal(env.launches.length, 1);
    let launched = env.launches[0];
    assert.equal(launched[1].title, 'AniLibria', 'resume uses the resolved dub, not the first dub sharing its provider');
    assert.equal(launched[3].video_id, 'libria-k2', 'different video ids still match the same normalized episode');
    assert.equal(launched[3].watched.end_time, 321);
    assert.equal(launched[3].duration, 1440);
    assert.equal(launched[2].length, 2, 'resume keeps the complete selected provider playlist');

    env = environment({history: oldHistory});
    env.preferences.setDefaults({voice: 'Studio Band', source: 'kodik'});
    env.preferences.remember(card, {title: 'AniLibria', player: 'Kodik'});
    env.menu.openVideos(card, true); await settle();
    assert.equal(env.launches[0][1].title, 'AniLibria', 'per-title preferences also win during resume');
    assert.equal(env.launches[0][3].video_id, 'libria-k2');

    env = environment({history: oldHistory});
    env.preferences.remember(card, {title: 'Unavailable voice', player: 'Kodik'});
    env.menu.openVideos(card, true); await settle();
    assert.equal(env.launches.length, 0, 'unavailable preferences must not silently resume a different dub');
    assert.equal(env.pickers.length, 1);
    assert.equal(env.pickers[0][2].unavailable, true, 'the fallback warning is passed to the visible setup');
    assert.equal(env.preferences.saved(card).voice, 'Unavailable voice');

    env = environment({history: oldHistory});
    env.preferences.setDefaults({voice: 'AniLibria', source: 'sibnet'});
    env.menu.openVideos(card, true); await settle();
    assert.equal(env.launches.length, 0, 'resume cannot launch another episode when its preferred source lacks the saved episode');
    assert.equal(env.pickers.length, 1);
    assert.equal(env.preferences.source(env.pickers[0][2].group), 'sibnet');

    env = environment({pending: true});
    env.menu.openVideos(card, false);
    env.changeOrigin({component: 'yani_detail', id: 43});
    env.requests[0].resolve({response: clone(fixture)}); await settle();
    assert.equal(env.pickers.length + env.launches.length, 0, 'a late result cannot replace the activity the user moved to');
    assert.equal(env.notices.length + env.errors.length + env.restores.length + env.timers.size, 0);

    env = environment({pending: true});
    env.menu.openVideos(card, false);
    env.menu.openVideos({yani_id: 43, title: 'New request'}, false);
    env.requests[0].resolve({response: clone(fixture)}); await settle();
    assert.equal(env.pickers.length, 0, 'an older response is ignored even while its replacement is still pending');
    assert.equal(env.loads.stop, 0, 'an old request cannot stop its replacement loading state');
    env.requests[1].resolve({response: clone(fixture)}); await settle();
    assert.equal(env.pickers.length, 1);
    assert.equal(env.pickers[0][0].yani_id, 43);
    assert.equal(env.loads.stop, 1);

    env = environment({pending: true});
    env.menu.openVideos(card, false);
    env.menu.openVideos({yani_id: 43}, false);
    env.requests[0].reject(new Error('Stale request failure')); await settle();
    assert.equal(env.loads.stop, 0, 'a stale failure cannot dismiss current loading');
    assert.equal(env.notices.length + env.errors.length + env.restores.length + env.timers.size, 0,
        'a stale failure must not show an error or schedule restoration of obsolete focus');
    env.requests[1].resolve({response: clone(fixture)}); await settle();
    assert.equal(env.pickers.length, 1);

    env = environment({pending: true});
    env.menu.openVideos(card, false);
    env.menu.beginPlaybackNavigation();
    env.requests[0].resolve({response: clone(fixture)}); await settle();
    assert.equal(env.pickers.length + env.launches.length, 0, 'a changed playback navigation session invalidates its pending video request');

    const current = {url: 'https://media.example/direct.mp4', title: 'Fixture episode'}, playlist = [current];
    env = environment({external: true, target: 'internal'});
    env.preferences.rememberTarget(card, 'external');
    assert.equal(env.menu.showDirectPlaybackOptions(card, current, playlist), true);
    assert.equal(env.direct.external.length, 1, 'an Android title-specific external choice overrides the global internal target');
    env.menu.showDirectPlaybackOptions({yani_id: 43}, current, playlist);
    assert.equal(env.direct.internal.length, 1, 'another anime retains the global target');
    env.preferences.rememberTarget(card, 'internal'); env.setTarget('external');
    env.menu.showDirectPlaybackOptions(card, current, playlist);
    assert.equal(env.direct.internal.length, 2, 'an explicit internal title choice overrides a global external target');
    env.preferences.rememberTarget(card, 'external');
    env.menu.showDirectPlaybackOptions(card, current, playlist, {autoAdvance: true, playbackTarget: 'external'});
    assert.equal(env.direct.internal.length, 3, 'auto-next stays internal without a player selection interruption');
    assert.equal(env.direct.external.length, 1);

    env = environment({external: false, target: 'external'});
    env.preferences.rememberTarget(card, 'external');
    env.menu.showDirectPlaybackOptions(card, current, playlist);
    assert.equal(env.direct.external.length, 0, 'WebOS/browser cannot launch an Android external player');
    assert.equal(env.direct.internal.length, 1, 'unsupported external preferences safely use the internal player');

    env = environment({external: true, target: 'ask'});
    env.menu.showDirectPlaybackOptions(card, current, playlist);
    assert.equal(env.selects.length, 1);
    env.selects[0].onSelect(env.selects[0].items.find(item => item.action === 'internal'));
    assert.equal(env.preferences.target(card, 'external'), 'internal', 'the native player chooser remembers an explicit choice for this anime');
    env.menu.showDirectPlaybackOptions(card, current, playlist);
    assert.equal(env.selects.length, 1, 'a remembered target avoids repeatedly asking which player to use');
    assert.equal(env.direct.internal.length, 2);

    console.log('Playback setup integration checks passed');
})().catch(error => { console.error(error); process.exit(1); });
