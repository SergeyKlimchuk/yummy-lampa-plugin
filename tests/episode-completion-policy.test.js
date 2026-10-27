'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.env.YANI_REPO_ROOT || path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
function environment(options = {}) {
    const storage = options.storage || {};
    const sent = [], playerCalls = [];
    const empty = {each() { return this; }, not() { return this; }};
    const g = {
        console,
        Date,
        setTimeout() { return 1; },
        clearTimeout() {},
        $: () => empty,
        LampaYaniAuth: {token: () => 'fixture-token', get: () => ({login: 'alice'})},
        LampaYaniApi: {syncVideoProgress: (videoId, time, duration) => { sent.push({videoId, time, duration}); return Promise.resolve(); }},
        Lampa: {
            Storage: {get: (key, fallback) => Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : fallback,
                set: (key, value) => { storage[key] = value; }},
            Player: {play: (...args) => playerCalls.push(args), close: (...args) => playerCalls.push(args)}
        }
    };
    g.window = g;
    vm.createContext(g);
    ['src/episode.js', 'src/ui-utils.js', 'src/ui-episode-progress.js', 'src/ui-home-sections.js', 'src/ui-playback-history.js'].forEach(file => vm.runInContext(read(file), g));
    const history = g.LampaYaniPlaybackHistory.create({progress: g.LampaYaniEpisodeProgress});
    return {g, utils: g.LampaYaniUiUtils, progress: g.LampaYaniEpisodeProgress, home: g.LampaYaniHomeSections, history, storage, sent, playerCalls};
}
function video(number, time, duration, flags = {}) {
    return {number, video_id: 'video-' + number, duration, watched: {end_time: time, ...flags}};
}
function state(env, item) { return env.progress.state(env.progress.index(42, [item]), item); }
const e = environment();

// Use one duration-aware threshold for local observations, API imports and queue
// decisions. Standard anime episodes tolerate their ending/preview section;
// short specials and films retain the conservative 95% completion rule.
for (const [duration, threshold] of [[1440, 1140], [1200, 900], [900, 675], [2400, 2100], [600, 570], [100, 95], [5400, 5130]]) {
    assert.strictEqual(e.utils.episodeCompletionThreshold(duration), threshold);
    assert.strictEqual(e.utils.isEpisodeFinished(threshold - 1, duration), false, duration + ': the second before the boundary stays resumable');
    assert.strictEqual(e.utils.isEpisodeFinished(threshold, duration), true, duration + ': the boundary counts as finished');
}
for (const duration of [0, -1, NaN, Infinity, undefined]) {
    assert.strictEqual(e.utils.episodeCompletionThreshold(duration), Infinity, 'invalid/unknown duration has no inferred completion boundary');
    assert.strictEqual(e.utils.isEpisodeFinished(1140, duration), false, 'position alone does not prove completion without duration');
}
assert.strictEqual(e.utils.isEpisodeFinished(1200, 1440), true, 'leaving four minutes of credits is finished');
assert.strictEqual(e.utils.isEpisodeFinished(1140, 1440), true, 'leaving five minutes of credits is finished');
assert.strictEqual(e.utils.isEpisodeFinished(1139, 1440), false);
assert.strictEqual(e.utils.isEpisodeFinished(720, 1440), false, 'the middle of a normal episode stays resumable');
assert.strictEqual(e.utils.isEpisodeFinished(0, 1440), false);
assert.strictEqual(e.utils.isEpisodeFinished(300, 600), false, 'five minutes left is not sufficient for a short special');
assert.strictEqual(e.utils.isEpisodeFinished(5000, 5400), false, 'a feature film is not treated like a 24-minute episode');
for (const flag of [true, 1, 'true', '1']) {
    assert.strictEqual(e.utils.isEpisodeFinished(0, 0, {completed: flag}), true);
    assert.strictEqual(e.utils.isEpisodeFinished(0, 0, {finished: flag}), true);
}
for (const flag of [false, 0, 'false', '0', '', null, undefined]) {
    assert.strictEqual(e.utils.isEpisodeFinished(0, 1440, {completed: flag, finished: flag}), false, 'false-like server flags are not completion');
}

assert.strictEqual(state(e, video('SP 01', 1140, 1440)).state, 'completed');
assert.strictEqual(state(e, video('SP 01', 1139, 1440)).state, 'started');
assert.strictEqual(state(e, video('SP 01', 1140, 0)).state, 'started');

// Existing persisted observations written with the former 95% rule must be
// re-evaluated without a fresh playback/API snapshot. Explicit completed badges
// remain completed when the viewer replays an episode from the beginning.
const journalKey = 'yani_episode_progress_v1:' + encodeURIComponent('login:alice');
const restored = environment({storage: {[journalKey]: JSON.stringify({version: 1, titles: {42: {a: 1, episodes: {
    1: {s: 1, t: 1140, d: 1440, a: 1},
    2: {s: 1, t: 1139, d: 1440, a: 1},
    3: {s: 2, t: 1, d: 1440, a: 1}
}}}})}});
const states = restored.progress.index(42, []);
assert.strictEqual(restored.progress.state(states, {number: 1}).state, 'completed', 'old partial journal uses the current completion policy after reload');
assert.strictEqual(restored.progress.state(states, {number: 2}).state, 'started');
assert.strictEqual(restored.progress.state(states, {number: 3}).state, 'completed', 'an already confirmed completion survives replay');

// The TV records the real stop position, not a fabricated end-of-video marker.
// Its own continuation decision may advance to the next episode while Yummy
// receives exactly the observed seconds/duration.
const card = {yani_id: 42, title: 'Fixture anime', yani_episodes: {aired: 12, count: 12}};
const current = video(1, 0, 1440);
const group = {title: 'Fixture dub', player: 'Kodik'};
e.history.updatePlaybackProgress({card, group, selected: current, progressOwner: e.progress.owner()}, 1140, 1440, true);
assert.strictEqual(e.sent.length, 1);
assert.strictEqual(e.sent[0].time, 1140);
assert.strictEqual(e.sent[0].duration, 1440);
assert.strictEqual(current.watched.end_time, 1140);
assert.strictEqual(e.history.getPlayback(42).time, 1140);
assert.strictEqual(e.progress.state(e.progress.index(42, []), current).state, 'completed');
const localQueue = e.home.continueWatchingEntries(e.home.mergeHistory(e.history.playbackHistory(), []), {}, {42: 12});
assert.strictEqual(localQueue[0].number, '2');
assert.strictEqual(localQueue[0].resume_next, true);
assert.strictEqual(e.playerCalls.length, 0, 'completion changes the queue/badge, and must not interrupt the running ending or post-credit scene');

const elsewhere = environment();
const remote = [{anime_id: 77, video_id: 7704, number: '4', time: 1140, duration: 1440, updated_at: 1710000000000}];
const imported = elsewhere.home.importRemoteIntoLocal({}, remote);
const remoteQueue = elsewhere.home.continueWatchingEntries(elsewhere.home.mergeHistory(imported.history, []), {}, {77: 12});
assert.strictEqual(remoteQueue[0].number, '5', 'remote time/duration reaches the same next-episode decision on a fresh device');
assert.strictEqual(imported.history[77].time, 1140, 'remote import preserves actual stop time');
assert.strictEqual(elsewhere.home.continueWatchingEntries([{anime_id: 77, video_id: 7712, number: '12', time: 1140, duration: 1440, updated_at: 2}], {}, {77: 12}).length, 0,
    'the last released episode leaves Continue Watching after the same ending threshold');
assert.strictEqual(elsewhere.home.continueWatchingEntries([{anime_id: 77, video_id: 7704, number: '4', time: 1139, duration: 1440, updated_at: 2}], {}, {77: 12})[0].number, '4');

// Explicit server completion must survive every normalization/cache hop even
// without a duration. A synthetic next episode must never inherit that flag.
const explicit = environment();
const fromServer = explicit.home.normalizeRemoteHistory({response: [
    {anime_id: 88, video_id: 8804, episode: 4, time: 10, duration: 0, watched: {finished: 'true'}, date: 1710000000},
    {anime_id: 99, video_id: 9901, episode: 1, time: 10, duration: 0, watched: {completed: 'false'}, date: 1710000000}
]});
assert.strictEqual(fromServer[0].completed, true);
assert.strictEqual(fromServer[1].completed, false);
const serverImport = explicit.home.importRemoteIntoLocal({}, fromServer);
const explicitQueue = explicit.home.continueWatchingEntries(explicit.home.mergeHistory(serverImport.history, []), {}, {88: 12, 99: 12});
assert.strictEqual(explicitQueue.find(item => String(item.anime_id) === '88').number, '5');
assert.strictEqual(explicitQueue.find(item => String(item.anime_id) === '88').completed, false);
assert.strictEqual(explicitQueue.find(item => String(item.anime_id) === '88').finished, false);
assert.strictEqual(explicitQueue.find(item => String(item.anime_id) === '99').number, '1');
const markedCard = {yani_id: 101, title: 'Server completed', yani_episodes: {aired: 12}};
explicit.history.importVideosProgress(markedCard, [video(4, 0, 0, {completed: true})]);
assert.strictEqual(explicit.history.getPlayback(101).completed, true, 'full episode snapshot retains explicit completion even with zero known time');
assert.strictEqual(explicit.history.getPlayback(101).time, 0);
assert.strictEqual(explicit.home.continueWatchingEntries(explicit.home.mergeHistory(explicit.history.playbackHistory(), []), {}, {101: 12})[0].number, '5');
explicit.history.importVideosProgress({yani_id: 102}, [video(1, 0, 0, {completed: 'false', finished: '0'})]);
assert.strictEqual(explicit.history.getPlayback(102), null, 'false-like markers do not create finished history');
const cached = explicit.history.rememberPlayback({yani_id: 103, title: 'Explicit saved'}, group, video(4, 10, 0, {finished: 1}));
assert.strictEqual(cached.completed, true);
const currentWins = explicit.home.mergeHistory({104: {number: '5', video_id: 10405, time: 60, duration: 1440, updated_at: 1710000100000}},
    [{anime_id: 104, number: '4', video_id: 10404, time: 10, duration: 0, finished: true, updated_at: 1710000000000}]);
assert.strictEqual(explicit.home.continueWatchingEntries(currentWins, {}, {104: 12})[0].number, '5', 'an older completion flag cannot mark a newer, different episode finished');

console.log('Anime completion policy: adaptive boundaries, legacy journal, sparse badges, local/remote continuation, exact server position and no eager transition passed');
