'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {environment, settle, deferred} = require('./native-playlist-runtime.test');
const source = fs.readFileSync(path.join(__dirname, '../src/ui.js'), 'utf8');

function functionSource(name) {
    const marker = '    function ' + name + '(';
    const start = source.indexOf(marker);
    assert.ok(start >= 0, 'ui.js must provide the actual ' + name + ' function');
    const tail = source.slice(start + marker.length);
    const next = tail.search(/\n    (?:function [A-Za-z_$][\w$]*\(|var [A-Za-z_$][\w$]*\s*=)/);
    assert.ok(next >= 0, name + ' must have a sibling function boundary');
    return source.slice(start, start + marker.length + next);
}
function setup(options) {
    options = options || {};
    const env = environment({index: 0});
    env.driver.destroy();
    env.globals.Playlist.destroy();
    const g = env.globals;
    const writes = [], remembered = [], synced = [], restores = [], requests = [], notices = [];
    const card = {yani_id: 42, title: 'Fixture anime', poster: 'poster.jpg'};
    const group = {title: 'Fixture dub', player: 'Kodik', videos: env.videos};
    const owner = {key: 'user:alice'};
    let currentOwner = owner, activity = {component: 'yani_detail', id: 42}, callback = null, timerId = 0;
    const node = {currentTime: 0, duration: 1440, ended: false, addEventListener() {}, removeEventListener() {}};
    const timers = new Map();
    env.videos.forEach(video => { video.iframe_url = 'https://provider.example/embed/' + video.video_id; });
    env.videos[0].yani_stream_url = 'https://media.example/1.m3u8';
    env.videos[1].watched.end_time = 123;
    env.videos[2].watched = {end_time: 1440, completed: true};
    const initialContext = {card, group, videos: env.videos, selected: env.videos[0], progressOwner: owner};
    Object.assign(g, {
        Lampa: {
            Player: g.Player, PlayerVideo: g.Video,
            Activity: {active: () => activity},
            Noty: {show: message => notices.push(message)}
        },
        LampaYaniEpisodeProgress: {owner: () => currentOwner, sameOwner: (left, right) => left && right && left.key === right.key},
        playbackContext: initialContext,
        nativePlaylistSession: null,
        playbackWatcher: null,
        playbackWatcherGeneration: 0,
        playbackReturnState: {session: 1, active: true},
        videoSourceUrl: video => video && (video.yani_stream_url || video.iframe_url || ''),
        videoResolverUrl: video => video.iframe_url,
        isAllohaUrl: () => false,
        isSibnetPlaybackSource: () => false,
        isExternalPlayableUrl: url => typeof url === 'string' && /\.m3u8(?:$|\?)/.test(url),
        internalPlayerExtensionHint: () => 'm3u8',
        markAndroidDirectVideoUrl: url => url,
        markAndroidDirectVideoQualities: quality => quality,
        videoStreamHeaders: video => video && video.yani_stream_headers || null,
        videoStreamQualities: video => video && video.yani_stream_qualities || null,
        warnAboutRequestHeaders() {},
        playerVideoElement: () => node.duration > 0 ? node : null,
        skipPreference: () => 'off',
        autoProgressSyncEnabled: () => true,
        destroySkipPrompt() {},
        recoverInternalPlayback() {},
        updatePlaybackProgress: (context, position, duration, remote) => {
            writes.push({video: context.selected, position, duration, remote});
            context.selected.watched.end_time = position;
            context.selected.duration = duration;
        },
        rememberPlayback: (selectedCard, selectedGroup, video) => remembered.push({card: selectedCard, group: selectedGroup, video}),
        addToLampaHistory() {},
        syncServerProgress: video => synced.push(video),
        restorePlaybackInteraction: (...args) => restores.push(args),
        closeInternalPlayer: () => { g.Player.close(); return Promise.resolve(); },
        LampaYaniStreamResolver: {
            canResolve: url => /^https:\/\/provider\.example\//.test(url),
            resolve: url => { const request = deferred(); requests.push({url, ...request}); return request.promise; }
        },
        setInterval: fn => { const id = ++timerId; timers.set(id, fn); return id; },
        clearInterval: id => timers.delete(id),
        t: key => key
    });
    g.Player.runas = player => env.events.push(['runas', player]);
    g.Player.playlist = items => g.Playlist.set(items);
    g.Player.callback = handler => { callback = handler; };
    // The real player may defer start/ready until Disclaimer or Preroll ends.
    // Its media object must become available only when the native start runs.
    g.Player.listener.follow('start', item => {
        node.currentTime = Number(item.timeline && item.timeline.time || 0);
        node.duration = Number(item.timeline && item.timeline.duration || 1440);
    });
    const baseDestroy = g.destroy;
    g.destroy = keepPip => {
        g.Video.listener.send('destroy', {current: node.currentTime, duration: node.duration});
        baseDestroy(keepPip);
        node.duration = 0;
    };
    g.Player.close = () => {
        env.events.push(['native-close']);
        g.destroy(false);
        const closingCallback = callback;
        callback = null;
        if (closingCallback) closingCallback();
    };
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/episode.js'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '../src/ui-utils.js'), 'utf8'), g);
    const functions = ['videoIdentity', 'internalPlayerPlaylistItem', 'buildExternalPlaylist', 'nativePlaylistVideoItem', 'resolveNativePlaylistVideo', 'createNativePlaylistSession', 'finishNativePlaylistSession', 'playInternalDirectVideo', 'playInternalPlayer', 'stopPlaybackWatcher', 'startPlaybackWatcher', 'flushPlaybackProgress', 'bindPlaybackVideo', 'storeObservedPlayback', 'bindPlayerProgressEvents'];
    vm.runInContext(functions.map(functionSource).join('\n'), g);
    const entry = {source: env.videos[0], url: env.videos[0].yani_stream_url};
    assert.strictEqual(g.playInternalPlayer(entry, []), true);
    env.events.length = 0;
    env.deferStarts(options.deferReady);
    return {env, g, node, writes, remembered, synced, restores, requests, notices, initialContext, owner, card, group, timers,
        time(position) { node.currentTime = position; g.Video.listener.send('timeupdate', {current: position, duration: 1440}); },
        changeOwner(value) { currentOwner = value; }, changeActivity(value) { activity = value; }};
}

(async function () {
    let h = setup();
    assert.strictEqual(h.g.Playlist.get().length, 12, 'root integration supplies a full queue to the actual native playlist');
    assert.strictEqual(h.timers.size, 1, 'one playback watcher observes the initial episode');
    h.time(73);
    h.g.Playlist.next();
    await settle();
    assert.strictEqual(h.requests.length, 1);
    h.requests[0].resolve({url: 'https://media.example/2.m3u8', source: 'kodik', qualities: {'1080p': 'https://media.example/2.m3u8'}});
    await settle();
    const oldFinal = h.writes.filter(write => write.video === h.env.videos[0] && write.remote).pop();
    assert.ok(oldFinal, 'before native teardown the departed episode is saved remotely');
    assert.strictEqual(oldFinal.position, 73, 'manual next preserves the actual old position without completing the episode');
    assert.strictEqual(h.g.playbackContext.selected, h.env.videos[1]);
    assert.strictEqual(h.g.nativePlaylistSession.context, h.g.playbackContext);
    assert.strictEqual(h.g.Playlist.position(), 1);
    assert.strictEqual(h.g.work.timeline.time, 123, 'saved position is passed through native timeline, not only an unused time property');
    assert.strictEqual(h.g.work.continue_play, true);
    assert.strictEqual(h.restores.length, 0, 'native handoff destroy must not restore title focus over playback');
    assert.strictEqual(h.remembered[0].video, h.env.videos[1]);
    assert.strictEqual(h.remembered[0].group, h.group, 'dub/provider stays selected');
    assert.strictEqual(h.timers.size, 1, 'native handoff replaces rather than accumulates playback watchers');
    h.time(177);
    h.g.Player.close();
    await settle();
    const activeFinal = h.writes.filter(write => write.video === h.env.videos[1] && write.remote).pop();
    assert.ok(activeFinal);
    assert.strictEqual(activeFinal.position, 177, 'Back saves the currently selected episode rather than the first callback context');
    assert.strictEqual(h.g.nativePlaylistSession, null);
    assert.strictEqual(h.g.playbackWatcher, null);
    assert.strictEqual(h.timers.size, 0);
    assert.strictEqual(h.restores.length, 1, 'Back restores interaction exactly once');

    h = setup();
    h.time(91);
    h.env.choose(0);
    await settle();
    assert.strictEqual(h.requests.length, 0, 'current-item native replay bypasses lazy resolution');
    assert.strictEqual(h.g.playbackContext.selected, h.env.videos[0]);
    assert.strictEqual(h.restores.length, 0, 'current-item native destroy does not masquerade as user Back');
    assert.strictEqual(h.timers.size, 1);
    assert.ok(h.writes.some(write => write.video === h.env.videos[0] && write.position === 91 && write.remote), 'native destroy captures progress even when no lazy hook ran');
    h.time(111);
    h.g.Player.close();
    assert.strictEqual(h.restores.length, 1);

    h = setup();
    h.env.choose(2);
    await settle();
    h.requests[0].resolve({url: 'https://media.example/3.m3u8', source: 'kodik'});
    await settle();
    assert.strictEqual(h.g.work.timeline.time, 0, 'completed target episodes restart through the native timeline at zero');
    assert.strictEqual(h.env.videos[2].watched.completed, true, 'rewatching retains the completed history flag');
    h.g.Player.close();

    h = setup({deferReady: true});
    h.time(64);
    h.g.Playlist.next();
    await settle();
    h.requests[0].resolve({url: 'https://media.example/2.m3u8', source: 'kodik'});
    await settle();
    assert.strictEqual(h.g.playbackContext.selected, h.env.videos[0], 'native callback before preroll completion must not move progress ownership to the unopened episode');
    assert.strictEqual(h.g.playbackWatcher, null, 'previous watcher is detached before native teardown and a new watcher waits for actual ready');
    assert.strictEqual(h.timers.size, 0);
    assert.strictEqual(h.remembered.length, 0, 'a deferred/unstarted episode must not enter playback history');
    assert.strictEqual(h.synced.length, 0, 'a deferred/unstarted episode must not be synced as watched');
    assert.strictEqual(h.restores.length, 0);
    h.env.finishStart();
    await settle();
    assert.strictEqual(h.g.playbackContext.selected, h.env.videos[1]);
    assert.strictEqual(h.g.playbackWatcher.context, h.g.playbackContext);
    assert.strictEqual(h.remembered.length, 1);
    assert.strictEqual(h.synced.length, 1);
    assert.strictEqual(h.timers.size, 1);
    h.time(180);
    h.g.Player.close();
    assert.strictEqual(h.restores.length, 1);
    assert.strictEqual(h.timers.size, 0);
    assert.ok(h.writes.some(write => write.video === h.env.videos[1] && write.position === 180 && write.remote));
    h.g.Player.listener.send('ready', h.g.Playlist.get()[1]);
    assert.strictEqual(h.timers.size, 0, 'finished sessions remove their native ready listener');

    h = setup();
    const staleReadyItem = h.g.nativePlaylistSession.playlist.items[0];
    h.g.Playlist.next();
    await settle();
    h.requests[0].resolve({url: 'https://media.example/2.m3u8', source: 'kodik'});
    await settle();
    const activeReadyContext = h.g.playbackContext;
    const activeReadyWatcher = h.g.playbackWatcher;
    const rememberedBeforeStaleReady = h.remembered.length;
    const syncedBeforeStaleReady = h.synced.length;
    h.g.Player.listener.send('ready', staleReadyItem);
    assert.strictEqual(h.g.playbackContext, activeReadyContext, 'a late ready from another item of the same queue cannot roll back active progress ownership');
    assert.strictEqual(h.g.playbackWatcher, activeReadyWatcher, 'a late ready cannot reset the current media watcher');
    assert.strictEqual(h.remembered.length, rememberedBeforeStaleReady, 'stale ready cannot replace history');
    assert.strictEqual(h.synced.length, syncedBeforeStaleReady, 'stale ready cannot sync a departed episode as playing');
    h.g.Player.close();

    h = setup();
    h.time(55);
    h.g.Playlist.next();
    await settle();
    h.requests[0].reject(new Error('Fixture stream unavailable'));
    await settle();
    assert.strictEqual(h.g.wait_for_loading_url, false, 'root error handling releases the actual native lazy-load lock');
    assert.strictEqual(h.g.nativePlaylistSession, null);
    assert.strictEqual(h.timers.size, 0);
    assert.strictEqual(h.restores.length, 1);
    assert.strictEqual(h.notices.length, 1);

    for (const invalidate of [
        current => { current.g.playbackReturnState.session++; },
        current => { current.changeOwner({key: 'user:bob'}); },
        current => { current.changeActivity({component: 'yani_home'}); }
    ]) {
        h = setup();
        h.g.Playlist.next();
        await settle();
        invalidate(h);
        h.requests[0].resolve({url: 'https://media.example/2.m3u8', source: 'kodik'});
        await settle();
        assert.strictEqual(h.g.playbackContext.selected, h.env.videos[0], 'late resolver cannot replace progress/account ownership after navigation');
        assert.strictEqual(h.env.videos[1].yani_stream_url, undefined, 'late resolver cannot write a signed URL into the abandoned video');
        assert.strictEqual(h.remembered.length, 0);
        assert.strictEqual(h.notices.length, 0);
        h.g.Player.close();
    }

    console.log('Native playlist/root integration: progress handoff, live context on Back, timeline resume/replay, single watcher/focus restore, error release and stale owner/session/activity passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
