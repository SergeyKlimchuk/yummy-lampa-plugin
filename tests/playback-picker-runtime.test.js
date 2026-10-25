'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function Node(tag) { this.tag = tag || 'div'; this.attrs = {}; this.classes = []; this.children = []; this.parentNode = null; this.text = ''; this.events = []; }
function text(node) { return node.text + node.children.map(text).join(''); }
function match(node, selector) {
    const attr = selector.match(/^\[([^=]+)="([^"]*)"\]$/);
    if (attr) return node.attrs[attr[1]] === attr[2];
    if (selector[0] === '.') return selector.slice(1).split('.').every(name => node.classes.includes(name));
    return node.tag === selector;
}
function find(node, selector, result = []) { node.children.forEach(child => { if (match(child, selector)) result.push(child); find(child, selector, result); }); return result; }
function parse(html) {
    const holder = new Node('fragment'), stack = [holder];
    for (const part of html.matchAll(/<\/?[^>]+>|[^<]+/g)) {
        const token = part[0];
        if (token.startsWith('</')) { stack.pop(); continue; }
        if (token[0] !== '<') { stack[stack.length - 1].text += token; continue; }
        const name = token.match(/^<([\w-]+)/); if (!name) continue;
        const node = new Node(name[1]);
        for (const attr of token.matchAll(/([\w-]+)="([^"]*)"/g)) node.attrs[attr[1]] = attr[2];
        node.classes = (node.attrs.class || '').split(/\s+/).filter(Boolean);
        node.parentNode = stack[stack.length - 1]; node.parentNode.children.push(node);
        if (!['img', 'input', 'path', 'br'].includes(node.tag)) stack.push(node);
    }
    holder.children.forEach(node => { node.parentNode = null; }); return holder.children;
}
function Wrapper(nodes) { this.nodes = nodes || []; this.length = this.nodes.length; this.jquery = true; this.nodes.forEach((node, i) => { this[i] = node; }); }
function $(value) { return value instanceof Wrapper ? value : new Wrapper(value instanceof Node ? [value] : typeof value === 'string' && value[0] === '<' ? parse(value) : []); }
function detach(node) { if (!node.parentNode) return; node.parentNode.children.splice(node.parentNode.children.indexOf(node), 1); node.parentNode = null; }
Wrapper.prototype.append = function (...values) { this.nodes.forEach(parent => values.forEach(value => $(value).nodes.forEach(node => { detach(node); node.parentNode = parent; parent.children.push(node); }))); return this; };
Wrapper.prototype.empty = function () { this.nodes.forEach(node => { node.children.forEach(child => { child.parentNode = null; }); node.children = []; node.text = ''; }); return this; };
Wrapper.prototype.text = function (value) { if (value === undefined) return this.nodes.map(text).join(''); this.empty(); this.nodes.forEach(node => { node.text = String(value); }); return this; };
Wrapper.prototype.addClass = function (names) { this.nodes.forEach(node => String(names || '').split(/\s+/).filter(Boolean).forEach(name => { if (!node.classes.includes(name)) node.classes.push(name); })); return this; };
Wrapper.prototype.toggleClass = function (name, enabled) { this.nodes.forEach(node => { node.classes = node.classes.filter(value => value !== name); if (enabled) node.classes.push(name); }); return this; };
Wrapper.prototype.attr = function (key, value) { if (typeof key === 'object') { Object.keys(key).forEach(name => this.attr(name, key[name])); return this; } if (value === undefined) return this[0] && this[0].attrs[key]; this.nodes.forEach(node => { node.attrs[key] = String(value); }); return this; };
Wrapper.prototype.on = function (event, callback) { this.nodes.forEach(node => { node.events.push({event, callback}); }); return this; };
Wrapper.prototype.trigger = function (event) { this.nodes.forEach(node => node.events.filter(handler => handler.event === event).forEach(handler => handler.callback.call(node, {currentTarget: node, target: node}))); return this; };
Wrapper.prototype.find = function (selector) { return new Wrapper(this.nodes.flatMap(node => find(node, selector))); };
Wrapper.prototype.first = function () { return new Wrapper(this.nodes.slice(0, 1)); };
Wrapper.prototype.each = function (callback) { this.nodes.forEach((node, index) => callback.call(node, index, node)); return this; };
Wrapper.prototype.remove = function () { this.nodes.forEach(detach); return this; };

function environment(options = {}) {
    const documentRoot = new Node('document'), timers = new Map(), launches = [], remembered = [], defaults = [], storage = {}, notices = [], controllers = {};
    let sequence = 0, currentTarget = 'internal', selectedAnime = false, resets = 0, playlistCalls = 0;
    const prefs = {
        normalizeVoice: value => String(value).toLowerCase().trim(), source: group => String(group.playerId || group.player).toLowerCase(),
        saved: () => selectedAnime ? {} : null,
        remember: (card, group) => { selectedAnime = true; remembered.push([card.yani_id, group.title, group.playerId]); },
        setDefaults: patch => defaults.push(patch),
        reset: () => { selectedAnime = false; resets++; currentTarget = 'internal'; },
        resolve: (card, groups) => ({group: groups[0], origin: 'default', unavailable: false})
    };
    const Lampa = {
        Scroll: function (options) { assert.equal(options.mask, false); assert.equal(options.notransition, true); const root = $('<div class="scroll"></div>'); this.minus = () => {}; this.update = () => {}; this.append = value => root.append(value); this.render = js => js ? root[0] : root; this.destroy = () => root.remove(); },
        Controller: {enabled: () => ({name: 'content'}), add: (name, controller) => { controllers[name] = controller; }, toggle: name => { if (controllers[name] && controllers[name].toggle) controllers[name].toggle(); }, collectionSet: () => {}, collectionFocus: element => { find(documentRoot, '.focus').forEach(node => { node.classes = node.classes.filter(name => name !== 'focus'); }); if (element) { $(element).addClass('focus'); $(element).trigger('hover:focus'); } }},
        Storage: {set: (key, value) => { storage[key] = value; }}, Noty: {show: message => notices.push(message)}
    };
    const context = {window: {}, Lampa, $, document: {documentElement: {contains: node => { for (let current = node; current; current = current.parentNode) if (current === documentRoot) return true; return false; }}},
        setTimeout: fn => { const id = ++sequence; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id),
        console, Navigator: {canmove: () => true, move: () => {}, add: () => {}}};
    context.window = context;
    vm.runInNewContext(fs.readFileSync('src/episode.js', 'utf8') + '\n' + fs.readFileSync('src/ui-playback-picker.js', 'utf8'), context);
    const allVideos = length => Array.from({length}, (_, index) => ({number: index + 1, video_id: 'v' + (index + 1)}));
    const groups = [
        {title: 'Studio A', player: 'Kodik', playerId: 'kodik', videos: allVideos(1403)},
        {title: 'Studio A', player: 'Sibnet', playerId: 'sibnet', videos: allVideos(3)},
        {title: 'Studio B', player: 'Kodik', playerId: 'kodik', videos: allVideos(1403)}
    ];
    if (options.extraVoices) for (let index = 0; index < options.extraVoices; index++) groups.push({title: 'Extra Studio ' + index, player: 'Kodik', playerId: 'kodik', videos: allVideos(3)});
    const object = {card: {yani_id: 42, title: 'Fixture'}, groups, selection: {group: JSON.parse(JSON.stringify(groups[options.selectionIndex || 0])), origin: 'default', unavailable: false}};
    const component = context.LampaYaniPlaybackPicker.create(object, {
        t: key => key, preferences: prefs, sourceId: group => group.playerId, sourceLabel: group => group.player,
        playlist: (card, group) => { playlistCalls++; return group.videos; }, getPlayback: () => ({number: 1075, time: 31, duration: 100}),
        episodeTitle: (card, video) => 'Episode ' + video.number, groupSubtitle: group => group.videos.length + ' episodes',
        targetPreference: () => currentTarget, rememberTarget: (card, value) => { currentTarget = value; selectedAnime = true; }, externalAvailable: () => true,
        launch: (...args) => launches.push(args), goBack: () => {}
    });
    component.activity = {loader: () => {}, toggle: () => component.start()};
    component.create(); $(documentRoot).append(component.render()); component.start();
    const flush = () => { const work = Array.from(timers.values()); timers.clear(); work.forEach(fn => fn()); };
    flush();
    const root = component.render();
    const enter = key => { const element = root.find('[data-yani-focus-key="' + key + '"]'); assert.equal(element.length, 1, key + ' must identify one action'); element.trigger('hover:enter'); flush(); };
    return {component, root, groups, enter, flush, launches, remembered, defaults, storage, notices, controllers, timers, resetCount: () => resets, playlistCalls: () => playlistCalls};
}

let env = environment();
assert.equal(env.root.find('.yani-playback__episode').length, 60, 'only 60 episodes are rendered for a 1403-episode title');
assert.equal(env.root.find('.focus').attr('data-yani-focus-key'), 'watch', 'saved/default choice opens with one-OK playback');
assert.match(env.root.find('.yani-playback__watch').text(), /1075/);
assert.equal(env.playlistCalls(), 1, 'serialized selected group is reconciled with cached real groups');
env.enter('episode:1074');
assert.equal(env.launches.length, 1);
assert.equal(env.launches[0][2].length, 1403, 'the complete playlist reaches playback despite paging');
assert.equal(env.launches[0][3].number, 1075);
assert.equal(env.launches[0][3].watched.end_time, 31, 'resume position is carried to the same episode');
assert.ok(env.launches[0][4].jquery && env.launches[0][5].jquery, 'actual episode and Scroll collection are supplied for return focus');
env.enter('watch');
assert.equal(env.launches.length, 1, 'repeated OK cannot start a second resolver while playback is pending');
env.component.playbackRestored(); env.enter('watch');
assert.equal(env.launches.length, 2, 'confirmed playback return unlocks the next explicit launch');

env = environment();
env.enter('episode:1075');
assert.match(env.root.find('.yani-playback__watch-episode').text(), /1076/, 'clicking a different episode updates the persistent Watch action');
assert.equal(env.root.find('[data-yani-focus-key="episode:1075"]').attr('aria-pressed'), 'true');
assert.equal(env.root.find('[data-yani-focus-key="episode:1074"]').attr('aria-pressed'), 'false');
env.component.start();
assert.match(env.root.find('.yani-playback__watch-episode').text(), /1076/, 'the launched episode stays visible after player return');

env = environment({extraVoices: 35, selectionIndex: 36});
env.enter('voice');
assert.ok(env.root.find('.yani-playback__option').length <= 30);
assert.match(env.root.find('.yani-playback__option.is-selected').text(), /Extra Studio 33/, 'an existing selection opens its own option page rather than page zero');
assert.match(env.root.find('.focus').text(), /Extra Studio 33/, 'the current voice is immediately focused even beyond the first thirty');

env = environment();
env.enter('voice');
assert.equal(env.root.find('.yani-playback__option').length, 2, 'duplicate providers do not duplicate dubbing choices');
env.enter('option:1');
assert.deepEqual(env.remembered[0], [42, 'Studio B', 'kodik']);
assert.equal(env.launches.length, 0, 'changing a preference never starts playback');
assert.match(env.root.find('.yani-playback__watch').text(), /1075/, 'episode number survives a dub change');
env.enter('source');
assert.equal(env.root.find('.yani-playback__option').length, 1, 'unavailable dub/provider combinations are never offered');
env.controllers.content.back(); env.flush();
env.enter('voice'); env.enter('option:0'); env.enter('source'); env.enter('option:1');
assert.deepEqual(env.remembered.slice(-1)[0], [42, 'Studio A', 'sibnet']);
assert.match(env.root.find('.yani-playback__watch').text(), /3/);
assert.equal(env.root.find('.yani-playback__notice').text(), 'playback_episode_missing', 'a missing episode explains fallback');
assert.equal(env.root.find('.yani-playback__episode').length, 3, 'source-specific episode counts remain independent');
env.enter('target'); env.enter('option:1');
env.enter('save-defaults');
assert.equal(env.defaults[0].voice, 'Studio A'); assert.equal(env.defaults[0].source, 'sibnet');
assert.equal(env.storage.yani_playback_target, 'external', 'saving defaults also copies the selected native Android target');
env.enter('defaults'); assert.equal(env.resetCount(), 1);
assert.match(env.root.find('.yani-playback__field-value').text(), /Kodik/);
assert.equal(env.remembered.length, 3, 'resetting uses defaults without saving fallback as a new override');
env.component.pause(); env.enter('voice');
assert.equal(env.root.find('.yani-playback__options').length, 0, 'paused screens cannot take input');
env.component.destroy(); env.flush();
assert.equal(env.root.find('.selector').length, 0, 'destroy drops all screen controls');
assert.equal(env.timers.size, 0, 'destroy cancels deferred focus and launch guards');

console.log('Playback picker runtime: bounded episodes, real combinations, preference changes, return focus and lifecycle passed');
