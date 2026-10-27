'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = process.env.YANI_REPO_ROOT || path.resolve(__dirname, '..');
const ui = fs.readFileSync(path.join(root, 'src/ui.js'), 'utf8');
const source = fs.readFileSync(path.join(root, 'tests/fixtures/lampa-native/timeline.js.txt'), 'utf8');
function functionSource(name) {
    const marker = '    function ' + name + '(';
    const start = ui.indexOf(marker);
    assert.ok(start >= 0, 'real root function exists: ' + name);
    const tail = ui.slice(start + marker.length);
    const next = tail.search(/\n    (?:function [A-Za-z_$][\w$]*\(|var [A-Za-z_$][\w$]*\s*=)/);
    assert.ok(next >= 0);
    return ui.slice(start, start + marker.length + next);
}
function bus() {
    const handlers = {};
    return {follow(name, handler) { (handlers[name] || (handlers[name] = [])).push(handler); },
        send(name, data) { (handlers[name] || []).slice().forEach(handler => handler(data)); }};
}
function environment(mode = 'continue') {
    const seeks = [], selects = [];
    const g = {
        console,
        Video: {listener: bus(), to: position => seeks.push(position)},
        Player: {listener: bus()},
        Storage: {field: () => mode},
        Select: {show: data => selects.push(data), hide() {}},
        Lang: {translate: key => key},
        Utils: {secondsToTime: value => String(value)},
        setTimeout: () => 1, setInterval: () => 1, clearTimeout() {}, clearInterval() {},
        buildExternalPlaylist: (card, videos) => videos.map(video => ({title: card.title, url: 'https://media.example/1.m3u8', time: video.watched.end_time})),
        internalPlayerPlaylistItem: item => Object.assign({}, item)
    };
    g.window = g;
    vm.createContext(g);
    vm.runInContext(fs.readFileSync(path.join(root, 'src/episode.js'), 'utf8'), g);
    vm.runInContext(fs.readFileSync(path.join(root, 'src/ui-utils.js'), 'utf8'), g);
    vm.runInContext(functionSource('nativePlaylistVideoItem'), g);
    const native = source.replace(/^import .*\n/gm, '').replace('export default {', 'var NativeTimeline = {');
    vm.runInContext(native, g);
    g.NativeTimeline.init();
    return {g, seeks, selects,
        start(position, duration, flags) {
            const video = {number: 1, duration, watched: {end_time: position, ...(flags || {})}};
            const item = g.nativePlaylistVideoItem({card: {title: 'Fixture anime'}}, video);
            g.Player.listener.send('start', item);
            g.NativeTimeline.needToContinue(() => {});
            return {video, item};
        },
        tick(duration) { g.Video.listener.send('timeupdate', {current: 0, duration}); }
    };
}

for (const [duration, position] of [[1440, 1139], [600, 558], [720, 670], [5400, 5000]]) {
    const e = environment();
    const {item, video} = e.start(position, duration);
    assert.strictEqual(item.timeline.time, position, 'native resume uses the exact observed stop time');
    assert.strictEqual(item.timeline.duration, duration);
    assert.strictEqual(video.watched.end_time, position, 'native compatibility hint never fabricates server progress');
    e.tick(duration);
    assert.strictEqual(e.seeks.length, 1);
    assert.strictEqual(e.seeks[0], position, 'the actual native Timeline must resume unfinished content even above its old 90% heuristic');
}
for (const position of [1140, 1200, 1400]) {
    const e = environment();
    const {item, video} = e.start(position, 1440);
    assert.strictEqual(item.timeline.time, 0, 'choosing a finished episode starts a replay, rather than reopening the ending');
    assert.strictEqual(item.timeline.percent, 0);
    assert.strictEqual(video.watched.end_time, position, 'a replay choice does not erase the saved completion');
    e.tick(1440);
    assert.strictEqual(e.seeks.length, 0);
}
const flagged = environment();
const flaggedVideo = {number: 1, duration: 600, completed: 'true', watched: {end_time: 30}};
assert.strictEqual(flagged.g.nativePlaylistVideoItem({card: {title: 'Flagged'}}, flaggedVideo).timeline.time, 0, 'top-level server completion flags also start a deliberate replay');

let e = environment('ask');
e.start(558, 600);
assert.strictEqual(e.selects.length, 1, 'the native ask-to-continue policy stays in control');
e.tick(600);
assert.strictEqual(e.seeks.length, 0, 'no seek occurs before answering the native dialog');
e.selects[0].onSelect({yes: true});
e.tick(600);
assert.strictEqual(e.seeks[0], 558);
e = environment('ask');
e.start(558, 600);
e.selects[0].onSelect({yes: false});
e.tick(600);
assert.strictEqual(e.seeks.length, 0, 'native Start again is respected');
e = environment('again');
e.start(558, 600);
e.tick(600);
assert.strictEqual(e.seeks.length, 0, 'the global always-start-again setting is respected');

console.log('Real native Timeline: anime endings, late unfinished short/film resume, exact seconds and native ask/start-again policy passed');
