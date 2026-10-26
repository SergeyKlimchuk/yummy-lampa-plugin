'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.env.YANI_REPO_ROOT || path.resolve(__dirname, '..');
const fixtureRoot = process.env.YANI_NATIVE_FIXTURES || path.join(root, 'tests/fixtures/lampa-native');
const adapterSource = fs.readFileSync(path.join(root, 'src/ui-native-playlist.js'), 'utf8');
const playlistSource = fs.readFileSync(path.join(fixtureRoot, 'playlist.js.txt'), 'utf8');
const selectSource = fs.readFileSync(path.join(fixtureRoot, 'player-select.js.txt'), 'utf8');

function Subscribe() {
    const handlers = new Map();
    return {
        follow(name, handler) {
            if (!handlers.has(name)) handlers.set(name, []);
            handlers.get(name).push(handler);
        },
        remove(name, handler) { handlers.set(name, (handlers.get(name) || []).filter(value => value !== handler)); },
        send(name, event) { (handlers.get(name) || []).slice().forEach(handler => handler(event || {})); }
    };
}
function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return {promise, resolve, reject};
}
async function settle() {
    for (let turn = 0; turn < 12; turn++) await Promise.resolve();
}
function environment(options) {
    options = options || {};
    const events = [], requests = [], selections = [], errors = [], storageWrites = [], pendingStarts = [];
    let active = true, selectOpened = false, selectWindow = null, playCount = 0;
    const currentVideoNode = {};
    const params = {audio: 'ja', subtitles: 'ru', size: 'contain', speed: 1.25};
    const globals = {
        Promise, Object, Array, String, Number, Boolean, Math, Date, console,
        Subscribe,
        document: {pictureInPictureElement: null},
        wait_for_loading_url: false,
        work: null,
        Lang: {translate: key => key},
        Storage: {
            field: key => key === 'playlist_next' ? Boolean(options.autoNext) : null,
            set: (...args) => storageWrites.push(args)
        },
        Controller: {enabled: () => ({name: 'player_panel'}), toggle: name => events.push(['controller', name])},
        Select: {
            opened: () => selectOpened,
            show: config => { selectWindow = config; selectOpened = true; }
        },
        Info: {loading: () => events.push(['native-loading'])},
        Video: {
            listener: Subscribe(),
            video: () => currentVideoNode,
            verifyTube: () => false,
            saveParams: () => { events.push(['save-params']); return params; },
            setParams: value => { events.push(['set-params', value]); },
            pause: () => events.push(['pause'])
        },
        Panel: {listener: Subscribe()},
        Player: {listener: Subscribe(), playdata: () => globals.work}
    };
    globals.window = globals;
    globals.destroy = keepPip => {
        events.push(['native-destroy', keepPip]);
        globals.work = false;
        globals.wait_for_loading_url = false;
        globals.Player.listener.send('destroy');
    };
    globals.play = item => {
        assert.strictEqual(typeof item.url, 'string', 'native play receives a resolved media URL');
        events.push(['native-play', item]);
        globals.work = item;
        const started = () => { globals.Player.listener.send('start', item); globals.Player.listener.send('ready', item); };
        playCount++;
        if (options.deferStarts && playCount > 1) pendingStarts.push(started);
        else started();
    };
    globals.Player.play = globals.play;
    globals.Player.close = () => { events.push(['native-close']); globals.destroy(false); };
    vm.createContext(globals);
    vm.runInContext('(function () {\n' + playlistSource.replace(/^import .*$/gm, '').replace('export default {', 'globalThis.Playlist = {') + '\n})();', globals, {filename: 'upstream/playlist.js'});
    globals.Playlist.init();
    vm.runInContext(selectSource, globals, {filename: 'upstream/player-select.js'});
    vm.runInContext(adapterSource, globals, {filename: 'ui-native-playlist.js'});
    const videos = Array.from({length: 12}, (_, index) => ({video_id: 'v' + (index + 1), number: String(index + 1), duration: 1440, watched: {end_time: index === 4 ? 123 : 0}}));
    function item(video) {
        return {title: 'Anime · ' + video.number, url: 'https://media.example/' + video.number + '.m3u8', time: video.watched.end_time, headers: {'X-Fixture': video.number}, quality: {'1080p': 'https://media.example/' + video.number + '.m3u8'}};
    }
    function create(index) {
        const driver = globals.LampaYaniNativePlaylist.create({
            videos, selected: videos[index], current: item(videos[index]),
            title: video => 'Anime · ' + video.number,
            episode: video => video.number,
            normalize: item,
            resolve: video => {
                events.push(['resolve', video]);
                const request = deferred();
                requests.push({video, ...request});
                return request.promise;
            },
            valid: () => active,
            beforeSelect: (video, selectedItem) => { events.push(['before-select', video, selectedItem]); },
            onSelect: (video, selectedItem) => { selections.push([video, selectedItem]); events.push(['selected', video]); },
            onError: error => {
                errors.push(error);
                events.push(['error', error]);
                globals.Player.close(); // Integration releases the native lazy-load lock on failure.
            }
        });
        assert.ok(driver, 'native playlist driver is created');
        return driver;
    }
    const driver = create(options.index == null ? 3 : options.index);
    globals.play(driver.current);
    globals.Playlist.set(driver.items);
    function choose(index) {
        globals.Playlist.show();
        assert.ok(selectWindow && selectOpened, 'the native playlist opens its own selector');
        const selected = selectWindow.items[index];
        selectOpened = false;
        selectWindow.onSelect(selected);
    }
    return {globals, events, requests, selections, errors, storageWrites, videos, params, driver, item, create, choose,
        invalidate: () => { active = false; }, activate: () => { active = true; }, opened: value => { selectOpened = value; }, deferStarts: value => { options.deferStarts = Boolean(value); }, finishStart: () => { while (pendingStarts.length) pendingStarts.shift()(); }};
}

module.exports = {environment, settle, deferred};

if (require.main === module) (async function () {
    let env = environment();
    const {driver, globals, videos} = env;
    assert.strictEqual(driver.items.length, 12, 'the native playlist contains every episode of the selected dubbing/source');
    assert.strictEqual(globals.Playlist.get(), driver.items, 'the host receives the complete playlist by reference');
    assert.strictEqual(driver.current, driver.items[3]);
    assert.strictEqual(globals.Playlist.position(), 3);
    assert.strictEqual(typeof globals.work.url, 'string', 'active native work must keep its string URL');
    assert.ok(driver.items.filter((_, index) => index !== 3).every(item => typeof item.url === 'function'), 'all unselected episodes resolve lazily');
    assert.ok(driver.items.every(item => item.episode !== undefined && item.season !== undefined), 'native episode/season identity survives rearmed URL functions');

    globals.Playlist.next();
    await settle();
    assert.strictEqual(env.requests.length, 1);
    assert.strictEqual(env.requests[0].video, videos[4]);
    assert.strictEqual(driver.pending(), true);
    globals.Playlist.next();
    globals.Playlist.prev();
    assert.strictEqual(env.requests.length, 1, 'the actual native lazy-load guard prevents a second pending transition');
    assert.strictEqual(env.events.filter(event => event[0] === 'native-play').length, 1, 'current video stays running while the next URL resolves');
    env.requests[0].resolve(env.item(videos[4]));
    await settle();
    assert.strictEqual(driver.pending(), false);
    assert.strictEqual(globals.Playlist.position(), 4);
    assert.strictEqual(globals.work, driver.items[4]);
    assert.strictEqual(typeof globals.work.url, 'string', 'callback must never convert the active work URL to a function');
    assert.strictEqual(typeof driver.items[3].url, 'function', 'the departed episode is rearmed for fresh signed URLs on revisit');
    assert.strictEqual(globals.work.continue_play, true, 'the real native handler marks a handoff as continuous playback');
    assert.deepStrictEqual(globals.work.headers, {'X-Fixture': '5'});
    assert.strictEqual(globals.work.time, 123, 'a target episode retains its resume offset');
    assert.ok(globals.work.quality['1080p'].includes('/5.m3u8'));
    const before = env.events.findIndex(event => event[0] === 'before-select');
    const save = env.events.findIndex(event => event[0] === 'save-params');
    const destroy = env.events.findIndex(event => event[0] === 'native-destroy');
    const play = env.events.findIndex((event, index) => index > 0 && event[0] === 'native-play' && event[1] === driver.items[4]);
    const restore = env.events.findIndex(event => event[0] === 'set-params');
    const selected = env.events.findIndex(event => event[0] === 'selected');
    assert.ok(before >= 0 && before < save && save < destroy && destroy < play && play < restore && restore < selected,
        'adapter progress handoff surrounds the real native save/destroy/play/restore/callback sequence');
    assert.strictEqual(env.events[restore][1], env.params, 'the native audio/subtitle/size/speed parameters are passed intact');
    assert.strictEqual(env.storageWrites.length, 0, 'the adapter must not change host global preferences');
    assert.strictEqual(env.events.filter(event => event[0] === 'native-close').length, 0, 'successful changes use native select, never Player.close/relaunch');

    globals.Playlist.prev();
    await settle();
    assert.strictEqual(env.requests.length, 2);
    assert.strictEqual(env.requests[1].video, videos[3]);
    env.requests[1].resolve({...env.item(videos[3]), url: 'https://media.example/4.m3u8?fresh=1'});
    await settle();
    assert.strictEqual(globals.Playlist.position(), 3);
    assert.ok(globals.work.url.includes('fresh=1'), 'returning to an episode refreshes its signed media URL');
    assert.strictEqual(typeof driver.items[4].url, 'function');
    env.choose(9);
    await settle();
    assert.strictEqual(env.requests.length, 3, 'arbitrary selection uses Lampa’s actual playlist window');
    assert.strictEqual(env.requests[2].video, videos[9]);
    env.requests[2].resolve(env.item(videos[9]));
    await settle();
    assert.strictEqual(globals.Playlist.position(), 9);
    assert.strictEqual(env.selections.length, 3);
    env.choose(9);
    await settle();
    assert.strictEqual(env.requests.length, 3, 'choosing the already active episode uses its current direct URL');
    assert.strictEqual(env.selections.length, 4, 'native replay of the current item still rebinds playback tracking after destroy/play');
    assert.strictEqual(globals.Playlist.position(), 9);
    assert.strictEqual(typeof globals.work.url, 'string');
    assert.strictEqual(driver.pending(), false);

    env = environment({index: 0});
    env.globals.Playlist.prev();
    await settle();
    assert.strictEqual(env.requests.length, 0, 'native previous does not wrap at the beginning');
    env = environment({index: 11});
    env.globals.Playlist.next();
    await settle();
    assert.strictEqual(env.requests.length, 0, 'native next does not wrap at the end');

    for (const autoNext of [false, true]) {
        env = environment({autoNext});
        env.globals.Video.listener.send('ended');
        await settle();
        assert.strictEqual(env.requests.length, autoNext ? 1 : 0, 'native ended follows the host auto-next setting');
        if (autoNext) {
            env.globals.Playlist.next(); // A queued duplicate ended/manual request cannot race the native handoff.
            assert.strictEqual(env.requests.length, 1);
            env.requests[0].resolve(env.item(env.videos[4]));
            await settle();
            assert.strictEqual(env.selections.length, 1, 'one ended event selects exactly one following episode');
        }
        assert.strictEqual(env.storageWrites.length, 0);
    }
    env = environment({autoNext: true});
    env.opened(true);
    env.globals.Video.listener.send('ended');
    await settle();
    assert.strictEqual(env.requests.length, 0, 'native selector suppresses automatic transition while open');

    env = environment();
    env.globals.Playlist.next();
    await settle();
    const unavailable = new Error('Fixture provider unavailable');
    env.requests[0].reject(unavailable);
    await settle();
    assert.deepStrictEqual(env.errors, [unavailable]);
    assert.strictEqual(env.driver.pending(), false);
    assert.strictEqual(env.globals.wait_for_loading_url, false, 'owned failure closes native playback to release its private lazy-load lock');
    assert.strictEqual(env.events.filter(event => event[0] === 'native-play').length, 1, 'failed resolution never starts an invalid URL');
    const recovered = env.create(3);
    env.globals.play(recovered.current);
    env.globals.Playlist.set(recovered.items);
    env.globals.Playlist.next();
    await settle();
    assert.strictEqual(env.requests.length, 2, 'a fresh attempt works after native failure cleanup');
    env.requests[1].resolve(env.item(env.videos[4]));
    await settle();
    assert.strictEqual(env.globals.Playlist.position(), 4);

    env = environment({deferStarts: true});
    env.globals.Playlist.next();
    await settle();
    env.requests[0].resolve(env.item(env.videos[4]));
    await settle();
    assert.strictEqual(env.selections.length, 1, 'native callback can precede a deferred preroll/start event');
    assert.strictEqual(typeof env.globals.work.url, 'string');
    assert.strictEqual(env.globals.Playlist.position(), 4, 'episode/season identity identifies the new item before start emits its URL');
    env.finishStart();
    assert.strictEqual(env.globals.Playlist.position(), 4, 'deferred native start retains the selected item');
    assert.strictEqual(typeof env.driver.items[3].url, 'function');

    for (const invalidate of [current => current.invalidate(), current => current.driver.destroy()]) {
        env = environment();
        env.globals.Playlist.next();
        await settle();
        invalidate(env);
        env.globals.Player.close(); // User Back/new activity closes the native player independently.
        env.requests[0].resolve(env.item(env.videos[4]));
        await settle();
        assert.strictEqual(env.events.filter(event => event[0] === 'native-play').length, 1, 'stale owner/session resolution cannot reopen its native video');
        assert.strictEqual(env.selections.length, 0);
        assert.strictEqual(env.errors.length, 0, 'stale cancellation must not show an error over the new screen');
        assert.strictEqual(env.globals.wait_for_loading_url, false);
    }

    console.log('Native Lampa playlist runtime: full queue, lazy signed URLs, next/previous/select, native params/continue, ended ownership, failure cleanup and stale cancellation passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
