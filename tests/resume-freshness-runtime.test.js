'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = {window: {}, console, Date, Object, Number, String, Array, Math, Boolean, isFinite};
for (const file of ['episode', 'ui-utils', 'ui-home-sections', 'ui-playback-menu']) {
    vm.runInNewContext(fs.readFileSync('src/' + file + '.js', 'utf8'), context);
}
const utils = context.window.LampaYaniUiUtils;
const home = context.window.LampaYaniHomeSections;
const menu = context.window.LampaYaniPlaybackMenu.create();
const oldAt = 1720000100000, newAt = 1720000200000;
function saved(time, at = newAt, extra = {}) {
    return Object.assign({number: '4', video_id: 'v4', time, duration: 1440, updated_at: at}, extra);
}
function video(time, at = oldAt, number = '4') {
    const watched = {};
    if (time !== undefined) watched.end_time = time;
    if (at !== undefined) watched.updated_at = at;
    return {number, video_id: 'v' + number, duration: 1440, watched};
}
function resume(local, remote) {
    return menu.applySavedPlaybackPosition({yani_id: 42, yani_resume: local}, remote);
}
function merge(local, remote) {
    return home.mergeHistory({42: local}, [Object.assign({anime_id: 42}, remote)]);
}

assert.strictEqual(utils.playbackTimestamp(oldAt / 1000), oldAt);
assert.strictEqual(utils.playbackTimestamp(String(oldAt)), oldAt);
assert.strictEqual(utils.playbackTimestamp(new Date(oldAt).toISOString()), oldAt);
for (const value of [undefined, null, '', NaN, Infinity, -1, 'not a date']) {
    assert.strictEqual(utils.playbackTimestamp(value), 0);
}
assert.strictEqual(utils.playbackPosition({time: 0}), 0);
for (const value of [undefined, null, '', NaN, Infinity, -1, true, false]) {
    assert.strictEqual(utils.playbackPosition({time: value}), null);
}
assert.strictEqual(utils.playbackPosition({time: 0, position_known: false}), null);

assert.strictEqual(resume(saved(120), video(600)).watched.end_time, 120,
    'a newer local rewind must win over a larger old server position');
assert.strictEqual(resume(saved(0), video(600)).watched.end_time, 0,
    'an explicit restart at zero must survive a stale server response');
assert.strictEqual(resume(saved(600, oldAt), video(120, newAt / 1000)).watched.end_time, 120,
    'a newer server rewind in seconds must win over old local milliseconds');
assert.strictEqual(resume(saved(600, oldAt), video(0, new Date(newAt).toISOString())).watched.end_time, 0,
    'a fresh server restart with an ISO timestamp must stay at zero');
assert.strictEqual(resume(saved(120, 0), video(600, 0)).watched.end_time, 120,
    'without dates use the existing local preference, never the maximum position');
assert.strictEqual(resume(saved(0, 0), video(600, 0)).watched.end_time, 0);
assert.strictEqual(resume(saved(120, newAt), video(600, newAt / 1000)).watched.end_time, 120,
    'equal timestamps preserve the local/current checkpoint rather than guessing from position');
assert.strictEqual(resume(saved(120, 0), video(600, newAt)).watched.end_time, 600,
    'a dated server observation takes precedence over undated legacy progress');
assert.strictEqual(resume(saved(undefined), video(600, oldAt)).watched.end_time, 600,
    'a missing local position is not an explicit restart');
const different = video(600, oldAt, '5');
assert.strictEqual(resume(saved(120), different), different);
assert.strictEqual(different.watched.end_time, 600, 'another episode must retain its own position');

let entry = merge(saved(0), saved(600, oldAt))[0];
assert.strictEqual(entry.time, 0);
assert.strictEqual(entry.updated_at, newAt);
entry = merge(saved(600, oldAt), saved(120, newAt / 1000))[0];
assert.strictEqual(entry.time, 120);
entry = merge(saved(120, 0), saved(600, 0))[0];
assert.strictEqual(entry.time, 120, 'undated history must not guess freshness from time');
entry = merge(saved(0, newAt, {max_episode: 9, completed: false}), saved(600, oldAt, {max_episode: 4, completed: true}))[0];
assert.strictEqual(entry.completed, false, 'old completion flags must not leak into a fresh restart');
assert.strictEqual(entry.max_episode, 9, 'furthest reached episode remains independent of the last position');
assert.strictEqual(merge(saved(120), Object.assign(saved(600, oldAt), {number: '5', video_id: 'v5'})).length, 2,
    'positions for different episodes must not be merged');

const zeroRemote = home.normalizeRemoteHistory({response: [{anime_id: 42, video_id: 'v4', number: '4', time: 0, watched: {end_time: 600}, updated_at: newAt / 1000}]});
assert.strictEqual(zeroRemote[0].time, 0, 'explicit primary zero must not fall through to a stale alternate field');
assert.strictEqual(zeroRemote[0].position_known, true);
const absentRemote = home.normalizeRemoteHistory({response: [{anime_id: 42, video_id: 'v4', number: '4', updated_at: newAt / 1000}]});
assert.strictEqual(absentRemote[0].position_known, false);
entry = home.mergeHistory({42: saved(600, oldAt)}, absentRemote)[0];
assert.strictEqual(entry.time, 600, 'a missing remote time cannot fabricate a newer restart');
entry = merge(saved(undefined, oldAt, {position_known: false}), saved(120, newAt))[0];
assert.strictEqual(entry.position_known, true, 'an old missing-position marker cannot leak into an explicit new checkpoint');
assert.strictEqual(entry.time, 120);
const attached = home.attachHistoryEntry({}, absentRemote[0]);
assert.strictEqual(attached.yani_resume.position_known, false);

let imported = home.importRemoteIntoLocal({42: saved(600, oldAt)}, zeroRemote);
assert.strictEqual(imported.imported, 1);
assert.strictEqual(imported.history[42].time, 0);
assert.strictEqual(imported.history[42].updated_at, newAt);
imported = home.importRemoteIntoLocal({42: saved(120, newAt)}, [Object.assign({anime_id: 42}, saved(600, oldAt / 1000))]);
assert.strictEqual(imported.imported, 0, 'stale remote seconds cannot overwrite fresh local milliseconds');
imported = home.importRemoteIntoLocal({42: saved(120, 0)}, [Object.assign({anime_id: 42}, saved(600, 0))]);
assert.strictEqual(imported.imported, 0, 'undated remote maximum is not evidence of a later stop');
imported = home.importRemoteIntoLocal({}, [Object.assign({anime_id: 42}, saved(120, 0))]);
assert.strictEqual(imported.history[42].updated_at, 0, 'an undated imported record must not be stamped as a new observation');
// Full title imports must also preserve a dated server restart rather than
// skipping all zero positions, while empty watched defaults stay empty.
const store = {yani_playback_history: {42: saved(600, oldAt)}};
context.Lampa = context.window.Lampa = {Storage: {
    get: (key, fallback) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : fallback,
    set: (key, value) => {store[key] = value;}
}};
vm.runInNewContext(fs.readFileSync('src/ui-playback-history.js', 'utf8'), context);
const history = context.window.LampaYaniPlaybackHistory.create();
let result = history.importVideosProgress({yani_id: 42}, [video(0, newAt / 1000)]);
assert.strictEqual(result.imported, 1);
assert.strictEqual(history.getPlayback(42).time, 0);
assert.strictEqual(history.getPlayback(42).updated_at, newAt);
result = history.importVideosProgress({yani_id: 43}, [video(0, 0)]);
assert.strictEqual(result.imported, 0, 'an undated default zero is not proof of watching or restarting');
assert.strictEqual(history.getPlayback(43), null);
result = history.importVideosProgress({yani_id: 44}, [video(undefined, newAt)]);
assert.strictEqual(result.imported, 0, 'a timestamp alone is not a position');

console.log('Resume freshness: rewinds, explicit zero, timestamp formats, missing dates and episode isolation passed');
