'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('src/ui.js', 'utf8');
const episodeSource = fs.readFileSync('src/episode.js', 'utf8');
const utilsSource = fs.readFileSync('src/ui-utils.js', 'utf8');

// ui.js deliberately keeps these functions at one indentation level. Taking
// everything up to the next sibling function also handles strings/comments
// containing braces without introducing a second JavaScript parser.
function functionSource(name) {
    const marker = '    function ' + name + '(';
    const start = source.indexOf(marker);
    assert.ok(start >= 0, 'ui.js must provide the real ' + name + ' function');
    const rest = source.slice(start + marker.length);
    const next = rest.search(/\n    function [A-Za-z_$][\w$]*\(/);
    assert.ok(next >= 0, name + ' must have a sibling function boundary');
    return source.slice(start, start + marker.length + next);
}

function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return {promise, resolve, reject};
}

async function settle() {
    for (let turn = 0; turn < 8; turn++) await Promise.resolve();
}

function video(id, number, watched) {
    return {
        video_id: id,
        number,
        iframe_url: 'https://provider.example/embed/' + id,
        duration: 1440,
        watched: {end_time: watched || 0},
        data: {dubbing: 'Fixture voice', player: 'Kodik', player_id: 'kodik'}
    };
}

function environment(options) {
    options = options || {};
    const videos = [video('e1', '1'), video('e2', '2', 73), video('special', '4.5', 123)];
    const owner = {key: 'login:alice', persist: true};
    const card = {yani_id: 42, title: 'Fixture anime'};
    const group = {title: 'Fixture voice', player: 'Kodik', videos};
    const context = {card, group, videos, selected: videos[options.index == null ? 1 : options.index], progressOwner: owner};
    const node = {currentTime: 73, duration: 1440};
    const state = {context, video: node, advanced: false, autoNext: true, lastObservedPosition: 73, lastObservedDuration: 1440};
    const close = deferred();
    const events = [], launches = [], notices = [], restores = [];
    let currentOwner = owner;
    let currentActivity = {component: 'yani_detail', id: 42};
    const globals = {
        Promise,
        console: {log() {}, warn() {}, error() {}},
        playbackContext: context,
        playbackWatcher: state,
        playbackWatcherGeneration: 1,
        playbackReturnState: {session: 10, active: true},
        Lampa: {Noty: {show: message => notices.push(message)}, Activity: {active: () => currentActivity}},
        LampaYaniEpisodeProgress: {
            owner: () => currentOwner,
            sameOwner: (left, right) => Boolean(left && right && left.key === right.key)
        },
        videoSourceUrl: item => item && (item.yani_stream_url || item.iframe_url || ''),
        playerVideoElement: preferred => preferred || node,
        updatePlaybackProgress: (scoped, position, duration, remote) => {
            events.push({type: 'progress', context: scoped, id: scoped.selected.video_id, position, duration, remote, advanced: state.advanced});
        },
        stopPlaybackWatcher: () => {
            events.push({type: 'stop'});
            globals.playbackWatcher = null;
        },
        beginPlaybackNavigation: () => {
            events.push({type: 'navigation'});
            globals.playbackReturnState.session++;
        },
        closeInternalPlayer: closing => {
            events.push({type: 'close', video: closing, session: globals.playbackReturnState.session});
            return close.promise;
        },
        launchVideo: (...args) => {
            events.push({type: 'launch'});
            launches.push(args);
        },
        restorePlaybackInteraction: (...args) => restores.push(args),
        finishAutoNextPlayback: (...args) => events.push({type: 'finish', args}),
        advanceToNextEpisode: (...args) => events.push({type: 'auto-advance', args}),
        t: key => key
    };
    globals.window = globals;
    vm.runInNewContext(episodeSource + '\n' + utilsSource, globals);
    const functions = ['videoIdentity', 'adjacentEpisodeVideo', 'nextEpisodeVideo', 'flushPlaybackProgress', 'advancePlaybackWatcher', 'episodeNavigationAllowed', 'cancelEpisodeNavigation', 'failEpisodeNavigation', 'switchInternalEpisode'];
    vm.runInNewContext(functions.map(functionSource).join('\n'), globals);
    return {globals, context, state, owner, videos, card, group, node, close, events, launches, notices, restores,
        changeOwner: value => { currentOwner = value; }, changeActivity: value => { currentActivity = value; }};
}

function installResolvedLaunch(env) {
    const requests = [], loads = [], remembered = [], engines = [];
    const globals = env.globals;
    Object.assign(globals, {
        ALLOHA_RESOLVED_SOURCES: [],
        isAllohaUrl: () => false,
        isSibnetPlaybackSource: () => false,
        isVkPlaybackSource: () => false,
        isCvhPlaybackSource: () => false,
        isExternalPlayableUrl: url => /\.m3u8(?:$|\?)/.test(String(url || '')),
        setLoading: value => loads.push(value),
        LampaYaniStreamResolver: {
            canResolve: () => true,
            resolve: () => { const request = deferred(); requests.push(request); return request.promise; }
        },
        rememberPlayback: (...args) => remembered.push(args),
        addToLampaHistory() {},
        syncServerProgress() {},
        buildExternalPlaylist: (card, videos) => videos.map(item => ({source: item, url: globals.videoSourceUrl(item), title: 'Episode ' + item.number})),
        videoStreamHeaders: () => null,
        videoStreamQualities: () => null,
        showDirectPlaybackOptions: () => { throw new Error('episode switching must not reopen the global player picker'); },
        openEmbeddedEpisode: () => false,
        showExternalPlaybackOptions() {},
        openExternalPlayer: () => false,
        playInternalPlayer: (...args) => { engines.push(args); return true; }
    });
    vm.runInNewContext(['launchVideo', 'launchResolvedVideo'].map(functionSource).join('\n'), globals);
    return {requests, loads, remembered, engines};
}

function teardownEnvironment() {
    let now = 0, timerId = 0, attached = true;
    const timers = new Map(), events = [];
    const childSource = {removeAttribute: name => events.push('source:' + name)};
    const node = {
        pause: () => events.push('pause'),
        removeAttribute: name => events.push('video:' + name),
        querySelectorAll: () => [childSource],
        load: () => events.push('load')
    };
    const globals = {
        Promise,
        Date: {now: () => now},
        console: {warn() {}},
        PLAYER_CLOSE_POLL_MS: 80,
        PLAYER_CLOSE_SETTLE_MS: 120,
        PLAYER_CLOSE_TIMEOUT_MS: 3500,
        document: {documentElement: {contains: item => attached && item === node}},
        Lampa: {Player: {close: () => events.push('close')}},
        playerVideoElement: () => node,
        setTimeout: (callback, delay) => {
            const id = ++timerId;
            timers.set(id, {callback, due: now + delay});
            return id;
        }
    };
    vm.runInNewContext(['releasePlaybackVideo', 'waitForInternalPlayerTeardown', 'closeInternalPlayer'].map(functionSource).join('\n'), globals);
    function advance(milliseconds) {
        const until = now + milliseconds;
        while (true) {
            const next = [...timers].filter(([, timer]) => timer.due <= until)
                .sort((left, right) => left[1].due - right[1].due || left[0] - right[0])[0];
            if (!next) break;
            timers.delete(next[0]);
            now = next[1].due;
            next[1].callback();
        }
        now = until;
    }
    return {globals, node, events, timers, advance, detach: () => { attached = false; }};
}

(async function () {
    let env = environment();
    assert.strictEqual(env.globals.adjacentEpisodeVideo(env.context, -1), env.videos[0]);
    assert.strictEqual(env.globals.adjacentEpisodeVideo(env.context, 1), env.videos[2],
        'episode navigation follows the selected provider list, including nonconsecutive/special episode labels');
    assert.strictEqual(env.globals.nextEpisodeVideo(env.context), env.videos[2]);
    env.context.selected = JSON.parse(JSON.stringify(env.videos[1]));
    assert.strictEqual(env.globals.adjacentEpisodeVideo(env.context, -1), env.videos[0],
        'a copied selected video still matches the original playlist entry');
    env.context.selected = env.videos[0];
    assert.strictEqual(env.globals.adjacentEpisodeVideo(env.context, -1), null, 'the first episode must not wrap to the last');
    env.context.selected = env.videos[2];
    assert.strictEqual(env.globals.adjacentEpisodeVideo(env.context, 1), null, 'the last episode must not wrap to the first');
    env.context.selected = video('missing', '99');
    assert.strictEqual(env.globals.adjacentEpisodeVideo(env.context, 1), null, 'an unknown video must not select an unrelated episode');

    env = environment();
    const switching = env.globals.switchInternalEpisode(env.context, env.videos[2], env.node, {});
    assert.ok(switching && typeof switching.then === 'function', 'a switch exposes completion of its decoder handoff');
    assert.strictEqual(env.state.advanced, true, 'the old watcher loses ownership before player.close can emit ended/destroy');
    assert.strictEqual(env.launches.length, 0, 'the next video cannot start before old decoder teardown');
    const progress = env.events.find(event => event.type === 'progress');
    assert.ok(progress, 'switching flushes the current episode progress');
    assert.strictEqual(progress.context, env.context);
    assert.strictEqual(progress.id, 'e2');
    assert.strictEqual(progress.position, 73, 'manual navigation preserves the actual position rather than completing an episode');
    assert.strictEqual(progress.remote, true);
    assert.strictEqual(progress.advanced, true, 'ended/destroy callbacks already lose ownership while final progress is being flushed');
    assert.ok(env.events.indexOf(progress) < env.events.findIndex(event => event.type === 'close'));
    assert.ok(env.events.find(event => event.type === 'close').session > 10, 'closing cannot trigger an obsolete detail-page restore session');
    assert.strictEqual(await env.globals.switchInternalEpisode(env.context, env.videos[0], env.node, {}), false,
        'rapid second presses cannot open a second decoder or replace the first handoff');
    assert.strictEqual(env.events.filter(event => event.type === 'close').length, 1);
    env.globals.advancePlaybackWatcher(1, env.context, env.state);
    assert.strictEqual(env.events.filter(event => event.type === 'auto-advance').length, 0,
        'an ended event during a manual switch cannot schedule an extra automatic episode');
    env.close.resolve();
    assert.strictEqual(await switching, true);
    assert.strictEqual(env.launches.length, 1);
    const launch = env.launches[0];
    assert.strictEqual(launch[0], env.card);
    assert.strictEqual(launch[1], env.group, 'episode changes keep the selected dubbing/provider');
    assert.strictEqual(launch[2], env.videos, 'the complete selected provider playlist is retained');
    assert.strictEqual(launch[3], env.videos[2]);
    assert.strictEqual(launch[4].autoAdvance, true, 'navigation stays in the active internal player instead of reopening the global player picker');
    assert.strictEqual(launch[4].progressOwner, env.owner);
    assert.ok(launch[4].episodeNavigationToken, 'asynchronous stream resolution receives its navigation ownership token');
    assert.strictEqual(env.globals.episodeNavigationAllowed(launch[4]), true);
    env.globals.playbackReturnState.session++;
    assert.strictEqual(env.globals.episodeNavigationAllowed(launch[4]), false,
        'a URL resolved after another playback session cannot claim the current player');
    env.globals.cancelEpisodeNavigation(launch[4]);
    assert.strictEqual(launch[4].episodeNavigationToken.cancelled, true);
    assert.strictEqual(env.context.yaniEpisodeSwitch, false, 'cancelling a navigation releases only its context lock');

    env = environment();
    env.changeOwner({key: 'login:bob', persist: true});
    assert.strictEqual(await env.globals.switchInternalEpisode(env.context, env.videos[2], env.node, {}), false,
        'an old account context cannot start an episode navigation');
    assert.strictEqual(env.events.length, 0, 'invalid ownership is rejected before flushing another account or closing its player');

    env = environment();
    env.state.autoNext = false;
    let manual = env.globals.switchInternalEpisode(env.context, env.videos[0], env.node, {});
    env.close.resolve();
    assert.strictEqual(await manual, true, 'manual previous/next is available when automatic episode playback is disabled');
    assert.strictEqual(env.launches[0][3], env.videos[0]);

    env = environment();
    env.videos[0].watched = {end_time: 1440, completed: true};
    manual = env.globals.switchInternalEpisode(env.context, env.videos[0], env.node, {});
    env.close.resolve();
    assert.strictEqual(await manual, true);
    assert.strictEqual(env.videos[0].watched.end_time, 0, 'a completed episode selected again plays from the beginning');
    assert.strictEqual(env.videos[0].watched.completed, true, 'replaying retains the completed badge/history');

    for (const invalidate of [
        current => { current.globals.playbackReturnState.session++; },
        current => { current.globals.playbackContext = {selected: video('other', '1')}; },
        current => { current.changeActivity({component: 'yani_home'}); },
        current => { current.globals.playbackReturnState.active = false; },
        current => { current.changeOwner({key: 'login:bob', persist: true}); }
    ]) {
        env = environment();
        const pending = env.globals.switchInternalEpisode(env.context, env.videos[2], env.node, {});
        invalidate(env);
        env.close.resolve();
        assert.strictEqual(await pending, false, 'a handoff invalidated during decoder teardown must be cancelled');
        assert.strictEqual(env.launches.length, 0, 'a stale context/session/account must never launch its episode');
    }

    for (const invalidate of [
        current => { current.globals.playbackReturnState.session++; },
        current => { current.globals.playbackContext = {selected: video('other', '1')}; },
        current => { current.changeActivity({component: 'yani_home'}); },
        current => { current.globals.playbackReturnState.active = false; },
        current => { current.changeOwner({key: 'login:bob', persist: true}); }
    ]) {
        env = environment();
        const resolved = installResolvedLaunch(env);
        const pending = env.globals.switchInternalEpisode(env.context, env.videos[2], env.node, {});
        env.close.resolve();
        await settle();
        assert.strictEqual(resolved.requests.length, 1, 'episode switching resolves the selected provider URL through the real launch path');
        invalidate(env);
        resolved.requests[0].resolve({url: 'https://media.example/special.m3u8'});
        await pending;
        await settle();
        assert.strictEqual(resolved.engines.length, 0, 'a stale asynchronous stream response cannot open its video');
        assert.strictEqual(resolved.remembered.length, 0, 'a stale response cannot replace current playback history');
        assert.strictEqual(env.context.yaniEpisodeSwitch, false, 'stale resolution releases its old handoff lock');
    }

    env = environment();
    const resolved = installResolvedLaunch(env);
    const pending = env.globals.switchInternalEpisode(env.context, env.videos[2], env.node, {});
    env.close.resolve();
    await settle();
    resolved.requests[0].resolve({url: 'https://media.example/special.m3u8', quality: '1080p'});
    assert.strictEqual(await pending, true);
    await settle();
    assert.strictEqual(resolved.engines.length, 1, 'a still-owned resolved stream opens exactly once');
    assert.strictEqual(resolved.remembered.length, 1);
    assert.strictEqual(env.globals.playbackContext.selected, env.videos[2]);
    assert.strictEqual(env.videos[2].watched.end_time, 123, 'an unfinished target episode keeps its resume position');

    env = environment();
    const unavailable = installResolvedLaunch(env);
    const failed = env.globals.switchInternalEpisode(env.context, env.videos[2], env.node, {});
    env.close.resolve();
    await settle();
    unavailable.requests[0].reject(new Error('Fixture provider unavailable'));
    assert.strictEqual(await failed, false);
    assert.strictEqual(unavailable.engines.length, 0);
    assert.strictEqual(env.context.yaniEpisodeSwitch, false, 'a resolver failure releases the pending navigation');
    assert.strictEqual(env.restores.length, 1, 'an owned resolution failure gives the user back control');
    assert.strictEqual(env.notices.length, 1);

    let teardown = teardownEnvironment();
    let finished = false;
    let closing = teardown.globals.closeInternalPlayer(teardown.node).then(() => { finished = true; });
    assert.deepStrictEqual(teardown.events, ['close'], 'native close runs before waiting for DOM/video teardown');
    teardown.advance(80);
    await settle();
    assert.strictEqual(finished, false, 'an attached video still owns its hardware decoder');
    teardown.detach();
    teardown.advance(80);
    await settle();
    assert.strictEqual(finished, false, 'video removal is followed by the decoder settle delay');
    teardown.advance(119);
    await settle();
    assert.strictEqual(finished, false);
    teardown.advance(1);
    await closing;
    assert.strictEqual(finished, true);
    assert.deepStrictEqual(teardown.events, ['close'], 'normally removed video needs no forced source mutation');

    teardown = teardownEnvironment();
    finished = false;
    closing = teardown.globals.closeInternalPlayer(teardown.node).then(() => { finished = true; });
    teardown.advance(3520);
    await settle();
    assert.deepStrictEqual(teardown.events, ['close', 'pause', 'video:src', 'source:src', 'load'],
        'a stubborn old video releases media/source resources before the next decoder may be opened');
    assert.strictEqual(finished, false, 'forced release still observes the decoder settle delay');
    teardown.advance(120);
    await closing;
    assert.strictEqual(finished, true);

    await settle();
    console.log('Player episode navigation runtime tests passed');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
